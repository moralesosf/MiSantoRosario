// Links open PayPal's checkout; no payment or account data is handled here.
export const donationPresets={MXN:['60','100','150'],USD:['3','5','10']};
export function donationAmount(value){
 const text=String(value??'').trim().replace(',','.');
 if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(text))return null;
 const [whole,fraction='']=text.split('.'),cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(cents<1||cents>100000000)return null;
 return `${Math.floor(cents/100)}.${String(cents%100).padStart(2,'0')}`;
}
export function paypalDonationUrl(currency,amount){
 const normalized=donationAmount(amount);
 if(!Object.hasOwn(donationPresets,currency)||!normalized)return null;
 const url=new URL('https://www.paypal.com/cgi-bin/webscr');
 for(const [key,value] of Object.entries({cmd:'_donations',business:'andresmorales.vc@gmail.com',currency_code:currency,amount:normalized,item_name:'Sanctum Rosarium',no_shipping:'1'}))url.searchParams.set(key,value);
 return url.href;
}
function ordinal(day){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;
 const [year,month,date]=day.split('-').map(Number),time=Date.UTC(year,month-1,date),parsed=new Date(time);
 if(parsed.toISOString().slice(0,10)!==day)return null;
 return time/86400000;
}
export function shouldOfferCoffee(streak,lastShown,today){
 if(!Number.isInteger(streak)||streak<5)return false;
 const now=ordinal(today);if(now===null)return false;
 const previous=ordinal(lastShown);
 return previous===null||now-previous>=7;
}
