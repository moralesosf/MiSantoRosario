import test from 'node:test';
import assert from 'node:assert/strict';
import {donationAmount,paypalDonationUrl,shouldOfferCoffee,donationPresets} from '../donations.mjs';

test('PayPal: ambas monedas e importes sugeridos van al destinatario indicado',()=>{
 for(const [currency,amounts] of Object.entries(donationPresets))for(const amount of amounts){
  const url=new URL(paypalDonationUrl(currency,amount));
  assert.equal(url.origin,'https://www.paypal.com');assert.equal(url.pathname,'/cgi-bin/webscr');
  assert.equal(url.searchParams.get('cmd'),'_donations');assert.equal(url.searchParams.get('business'),'andresmorales.vc@gmail.com');
  assert.equal(url.searchParams.get('currency_code'),currency);assert.equal(url.searchParams.get('amount'),amount+'.00');
  assert.equal(url.searchParams.get('item_name'),'Sanctum Rosarium');
 }
});
test('importes: conserva centavos exactos y acepta coma; rechaza datos inválidos',()=>{
 for(const [input,expected] of [[' 15,25 ','15.25'],['0.01','0.01'],['001.2','1.20'],['2.55','2.55'],['999999.99','999999.99']])assert.equal(donationAmount(input),expected);
 for(const input of ['',null,undefined,'0','0.00','-3','1e3','3.141','4 USD','NaN','Infinity','<script>','1000000','1,2,3'])assert.equal(donationAmount(input),null);
 assert.equal(paypalDonationUrl('EUR','3'),null);assert.equal(paypalDonationUrl('__proto__','3'),null);assert.equal(paypalDonationUrl('USD','-1'),null);
});
test('café: primer aviso a partir de cinco días y posteriores tras siete días de calendario',()=>{
 assert.equal(shouldOfferCoffee(4,null,'2026-10-11'),false);
 assert.equal(shouldOfferCoffee(5,null,'2026-10-11'),true);
 assert.equal(shouldOfferCoffee(12,'2026-10-11','2026-10-11'),false);
 assert.equal(shouldOfferCoffee(12,'2026-10-05','2026-10-11'),false);
 assert.equal(shouldOfferCoffee(12,'2026-10-04','2026-10-11'),true);
 assert.equal(shouldOfferCoffee(5,'2026-10-18','2026-10-11'),false);
 assert.equal(shouldOfferCoffee(5,'2026-03-22','2026-03-29'),true);
 assert.equal(shouldOfferCoffee(5,'2024-02-23','2024-03-01'),true);
 assert.equal(shouldOfferCoffee(5,null,'2026-02-30'),false);
 assert.equal(shouldOfferCoffee(5,'corrupto','2026-10-11'),true);
});
