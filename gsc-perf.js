/* GSC — images Cloudinary plus légères (f_auto,q_auto), sans redimensionnement */
(function(){
  var RE=/(res\.cloudinary\.com\/[^\/]+\/image\/upload\/)(v\d+\/)/;
  function opt(u){
    return (typeof u==='string' && u.indexOf('res.cloudinary.com')>-1 && u.indexOf('f_auto')===-1)
      ? u.replace(RE,'$1f_auto,q_auto/$2') : u;
  }
  try{
    if(typeof sanitizeUrl==='function'){
      var orig=sanitizeUrl;
      sanitizeUrl=function(){ return opt(orig.apply(this,arguments)); };
    }
  }catch(e){}
})();
