/**
 * cookie 的获取 设置 以及删除
 * */
let cookie = {
  set(key, val, time) {//设置cookie方法
    let date = new Date(); //获取当前时间
    //将date设置为n天以后的时间
    date.setTime(date.getTime() + time * 24 * 3600 * 1000); //格式化为cookie识别的时间
    document.cookie = key + "=" + val + ";expires=" + date.toGMTString();  //设置cookie
  },
  get(key) {
    /*获取cookie参数*/
    //获取cookie，并且将获得的cookie格式化，去掉空格字符
    let getCookie = document.cookie.replace(/[ ]/g, "");
    //将获得的cookie以"分号"为标识 将cookie保存到arrCookie的数组中
    let arrCookie = getCookie.split(";");
    let cookie = false;
    for (let i = 0; i < arrCookie.length; i++) {
      let arr = arrCookie[i].split("=");
      if (key === arr[0]) {  //匹配变量名称，其中arr[0]是指的cookie名称，如果该条变量为tips则执行判断语句中的赋值操作
        cookie = arr[1];   //将cookie的值赋给变量cookie
        break;   //终止for循环遍历
      }
    }
    return cookie
  },
  delete(key) {
    let date = new Date(); //获取当前时间
    date.setTime(date.getTime() - 10000); //将date设置为过去的时间
    document.cookie = key + "=v; expires =" + date.toGMTString();//设置cookie
  }
};
export default cookie
