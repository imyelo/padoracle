const crackme = require('./crackme')

const TOKEN = '/ykbOUt8VvP5ZNPPL60Nu+ysyFt4f5d3hks5//UNUxT/////////////////////'

;(async () => {
  let result = await crackme.api.auth(TOKEN)
  console.log(result)
})()
