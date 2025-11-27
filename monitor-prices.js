
// monitor-prices.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config();

const STATE_FILE = './last_prices.json';

const URLS = [
  'https://shop.ctelecom.ir/nothing-cmf-phone1-with-holder-lanyard',
  'https://shop.ctelecom.ir/%DA%AF%D9%88%D8%B4%DB%8C-%D9%85%D9%88%D8%A8%D8%A7%DB%8C%D9%84-%D9%86%D8%A7%D8%AA%DB%8C%D9%86%DA%AF-%D9%85%D8%AF%D9%84-cmf-phone-1-%D8%AF%D9%88-%D8%B3%DB%8C%D9%85-%DA%A9%D8%A7%D8%B1%D8%AA-%D8%B8%D8%B1%D9%81%DB%8C%D8%AA-128-%DA%AF%DB%8C%DA%AF%D8%A7%D8%A8%D8%A7%DB%8C%D8%AA-%D9%88-%D8%B1%D9%85-8-%DA%AF%DB%8C%DA%AF%D8%A7%D8%A8%D8%A7%DB%8C%D8%AA-%D8%B3%D8%A7%D8%B9%D8%AA-%D9%87%D9%88%D8%B4%D9%85%D9%86%D8%AF-%D9%86%D8%A7%D8%AA%DB%8C%D9%86%DA%AF-%D9%85%D8%AF%D9%84-cmf-watch-pro-2',
  'https://shop.ctelecom.ir/%DA%AF%D9%88%D8%B4%DB%8C-%D9%85%D9%88%D8%A8%D8%A7%DB%8C%D9%84-%D9%86%D8%A7%D8%AA%DB%8C%D9%86%DA%AF-%D9%85%D8%AF%D9%84-cmf-phone-1-%D8%AF%D9%88-%D8%B3%DB%8C%D9%85-%DA%A9%D8%A7%D8%B1%D8%AA-%D8%B8%D8%B1%D9%81%DB%8C%D8%AA-128-%DA%AF%DB%8C%DA%AF%D8%A7%D8%A8%D8%A7%DB%8C%D8%AA-%D9%88-%D8%B1%D9%85-8-%DA%AF%DB%8C%DA%AF%D8%A8%D8%A7%DB%8C%D8%AA'
];

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;

function readState() { try { return JSON.parse(fs.readFileSync(STATE_FILE)); } catch { return {}; } }
function writeState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

function normalizePriceText(t){
  const pers = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};
  t = t.replace(/[۰-۹]/g, d => pers[d]);
  const m = t.match(/[\d\.,]+/);
  if(!m) return null;
  let num = m[0].replace(/,/g,'').replace(/\./g,'');
  return parseInt(num,10);
}

async function extractPrice(page){
  const txt = await page.evaluate(()=>document.body.innerText);
  const m = txt.match(/([\d۰-۹\.,]+)\s*تومان/);
  if(!m) return null;
  return normalizePriceText(m[1]);
}

async function notify(msg){
  if(!TOKEN || !CHAT) return console.log("Telegram not configured:", msg);
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({chat_id: CHAT, text: msg})
  });
}

(async()=>{
  const browser = await puppeteer.launch({args:['--no-sandbox']});
  const state = readState();
  try{
    for(const url of URLS){
      const page = await browser.newPage();
      await page.goto(url,{waitUntil:'networkidle2'});
      const price = await extractPrice(page);
      const old = state[url]?.price;
      if(!old || old !== price){
        const msg = `قیمت تغییر کرد:\n${url}\nجدید: ${price}\nقبلی: ${old||'نداشتیم'}`;
        await notify(msg);
        state[url] = {price, when:new Date().toISOString()};
      }
      await page.close();
    }
    writeState(state);
  }finally{
    await browser.close();
  }
})();
