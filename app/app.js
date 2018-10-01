import '@babel/polyfill'
import './sass/theme.sass'
import WebFont from 'webfontloader'

(async () => {
  console.log('...')
  
  WebFont.load({ google: { families: [ 'Poppins' ] } })
})()
