// Prepare every visual dependency before the first screen, including the regular
// serif used by mysteries. The decoded image is reused on each visit to Home.
const FONT_SPECS=['400 16px RosarioSerif','italic 400 16px RosarioSerif','400 16px Inter','700 16px Inter'];
async function loadFonts(){
 const faces=await Promise.all(FONT_SPECS.map(spec=>document.fonts.load(spec,'ÁÉÍÓÚáéíóúñ¿¡ Rosario Misterio')));
 if(faces.some(result=>result.length===0))throw Error('Falta una fuente de la app.');
 await document.fonts.ready;
}
async function loadBackground(){
 const image=new Image();
 image.className='home-art';image.alt='';image.draggable=false;image.fetchPriority='high';
 if(typeof image.decode==='function'){
  image.src='./assets/home-background.svg';
  await image.decode();
 }else{
  await new Promise((resolve,reject)=>{
   image.onload=resolve;image.onerror=()=>reject(Error('No se pudo cargar el fondo.'));
   image.src='./assets/home-background.svg';
  });
  image.onload=image.onerror=null;
 }
 return image;
}
export async function prepareVisuals(){
 const [,homeBackground]=await Promise.all([loadFonts(),loadBackground()]);
 return {homeBackground};
}
