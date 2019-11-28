/* eslint-disable */

import axios from 'axios';
import router from '@/router/index'
import authorization from '@/api/author'
import { i18n } from '@/main'
import store from '@/store'
import {
  MessageBox,
  Message,
  Loading
} from 'element-ui'

let loading //定义loading变量
function startLoading() { //使用Element loading-start 方法
  loading = Loading.service({
    lock: true,
    text: '加载中……',
    background: 'rgba(0, 0, 0, 0.7)'
  })
}

function endLoading() { //使用Element loading-close 方法
  loading.close()
}
//那么 showFullScreenLoading() tryHideFullScreenLoading() 要干的事儿就是将同一时刻的请求合并。
//声明一个变量 needLoadingRequestCount，每次调用showFullScreenLoading方法 needLoadingRequestCount + 1。
//调用tryHideFullScreenLoading()方法，needLoadingRequestCount - 1。needLoadingRequestCount为 0 时，结束 loading。
let needLoadingRequestCount = 0
export function showFullScreenLoading() {
  if (needLoadingRequestCount === 0) {
    startLoading()
  }
  needLoadingRequestCount++
}

export function tryHideFullScreenLoading() {
  if (needLoadingRequestCount <= 0) return
  needLoadingRequestCount--
  if (needLoadingRequestCount === 0) {
    endLoading()
  }
}

axios.defaults.timeout = 20000;
axios.defaults.withCredentials = false
// axios.defaults.headers.common['Authorization'] = authorToken();
axios.defaults.baseURL = process.env.BASEURL


//验证登录状态
router.beforeEach((to, from, next) => {
  //如果是需要验证登录状态的页面
  // 页面要跳转到 PlatformMiniIndex 页面
  if(to.name && to.name.indexOf("PlatformMiniIndex") != -1){
    if(window.sessionStorage.getItem('PlatformEmployeeId')){
      next();
    } else {
      localStorage.setItem('href', window.location.href)
      next({
        'name': 'Login',
        // 'query': '1'
      });
    }
  } else {
    if (to.matched.some(record => record.meta.requireAuth)) {
      let token = JSON.parse(authorization())
      //如果已经登录，则正常进入
      if (token && window.localStorage.getItem('USERINFO')) {
        next();
      } else {
        next({
          'name': 'Login',
          'query': {
            'redirect': to.fullPath
          }
        });
      };
    } else if (to.name == 'Login' || to.name == 'login') {
      //如果是登录页，则验证如果当前是登录状态自动跳转至系统主页，否则正常进入登录页
      let token = JSON.parse(authorization())
      //如果是从PlatformMiniIndex页面过来的，则去PlatformMiniIndex页面
      if(localStorage.getItem('href') && localStorage.getItem('href').indexOf("PlatformMiniIndex") === -1){
        //如果已经登录，则重定向至系统首页
        if (token && window.localStorage.getItem('USERINFO')) {
          router.push({
            'name': 'Main'
          })
        } else {
          next();
        };
      }
      next();
    } else { //其他页面正常进入
      next()
    }
  }
})


// http request 拦截器
let num = 0
axios.interceptors.request.use(
  config => {
    // const token = getCookie('名称');注意使用的时候需要引入cookie方法，推荐js-cookie
    let token = JSON.parse(authorization());
    num++
    store.commit("LOADING",true)
    // Vuex.commit("LOADING",true)
    if (!!token) { // 判断是否存在token，如果存在的话，则每个http header都加上token
      config.headers = {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    } else {
      config.headers = {
        'Content-Type': 'application/json'
      }
    }
    config.data = JSON.stringify(config.data);
    // showFullScreenLoading()
    return config;
  }
);

// http response 拦截器
axios.interceptors.response.use(
  response => {
    num--
    if(num <= 0){
      store.commit("LOADING",false)
      num = 0
    }else{
      store.commit("LOADING",true)
    }
    // 导出
    if (response.headers['content-type'] === 'application/octet-stream') {
      tryHideFullScreenLoading()
      return response
    } else if (response.headers['content-type'] === 'application/csv') {
      tryHideFullScreenLoading()
      return response
    } else if (response.headers['content-type'] === 'image/jpeg') {
      tryHideFullScreenLoading()
      return response
    } else if (response.data.code === 413) {
      Message.error('登录过期')
      setTimeout(() => {
        router.push({
          path: '/login',
          querry: {
            redirect: router.currentRoute.fullPath
          }
        })
      }, 1000)
      return false
    } else if (response.data.code >= 500) {
      MessageBox({
        type: 'warning',
        title: '提示',
        message: `${response.data.msg || '服务器出错，请稍后再试'}`
      })
      return false
    }
    tryHideFullScreenLoading()
    return response;
  },
  error => {
    tryHideFullScreenLoading()
    store.commit("LOADING",false)
    num=0
    if (error.response.status === 403) {
      MessageBox({
        type: 'warning',
        title: '提示',
        message: '权限未通过校验'
      })
    } else if (error.response.status === 400) {
      if (error.response.data.code === 4001) {
        if (error.response.data.messageInfo) {
          Message.error(i18n.t(error.response.data.messageInfo))
        } else if(error.response.data.messageKey) {
          Message.error(i18n.t(error.response.data.messageKey))
        }else{
          Message.error('接口返回值不规范')
        }
      } else if (error.response.data.code === 4002) {
        return error.response
      } else {
        if (error.response.data.size) {
          let fileReader = new FileReader()
          fileReader.onload = function () {
            let jsonData = JSON.parse(this.result)
            Message.error(jsonData.messageInfo)
            return jsonData.code
          }
          fileReader.readAsText(error.response.data)
        } else {
          Message.error('参数错误')
        }
        return error.response
      }
    } else if (error.response.status === 401) {
      router.push({ path: '/login', querry: { redirect: router.currentRoute.fullPath } })
      // 提示语重复出现问题处理 feifie.liu 20190903
      if (error.response.data.messageInfo === "Invalid token!") {
        window.sessionStorage.setItem('INVALID_TOKEN_NUM', 1)
      }
      return error.response
    } else if (error.response.status >= 500) {
      MessageBox({
        type: 'warning',
        title: '提示',
        message: '系统异常，请稍后再试'
      })
    } else {
      MessageBox({
        type: 'warning',
        title: '提示',
        message: '链接出错，请检查网络状况'
      })
    }
    return Promise.reject(error)
  }
)

/**
 * 封装get方法
 * @param url
 * @param data
 * @returns {Promise}
 */

export function fetch(url, params = {}) {
  return new Promise((resolve, reject) => {
    axios.get(url, {
      params: params
    })
      .then(response => {
        if (response && response.data) {
          resolve(response.data)
        }
      })
      .catch(err => {
        reject(err)
      })
  })
}

/**
 * 封装get Download方法
 * @param url
 * @param blob
 * @returns {Promise}
 */

export function getDownload(url, params = {}) {
  return new Promise((resolve, reject) => {
    axios.get(url, {
      params: params,
      responseType: 'blob'
    })
      .then(response => {
        resolve(response)
      })
      .catch(err => {
        reject(err)
      })
  })
}
/**
 * 封装get File方法
 * @param url
 * @param blob
 * @returns {Promise}
 */
export function getFile(url, params = '') {
  return new Promise((resolve, reject) => {
    axios.get(url + '/' + params,{
      responseType: 'blob'
    })
    .then(response => {
      resolve(response)
    })
    .catch(err => {
      reject(err)
    })
  })
}

/**
 * 封装post Download方法
 * @param url
 * @param blob
 * @returns {Promise}
 */

export function postDownload(url, data = {}) {
  return new Promise((resolve, reject) => {
    axios.post(url, data, {
      responseType: 'blob'
    })
      .then(response => {
        resolve(response)
      })
      .catch(err => {
        reject(err)
      })
  })
}

/**
 * 封装get方法
 * @param url
 * @single data
 * @returns {Promise}
 */

export function singlefetch(url, params = '') {
  return new Promise((resolve, reject) => {
    axios.get(url + '/' + params)
      .then(response => {
        if (response && response.data) {
          resolve(response.data);
        }
      })
      .catch(err => {
        reject(err)
      })
  })
}


/**
 * 封装post请求
 * @param url
 * @param data
 * @returns {Promise}
 */
export function post(url, data = {}) {
  return new Promise((resolve, reject) => {
    axios.post(url, data)
      .then(response => {
        resolve(response.data);
      })
      .catch(err => {
        reject(err)
      })
  })
}

/**
 * 封装patch请求
 * @param url
 * @param data
 * @returns {Promise}
 */

export function patch(url, data = {}) {
  return new Promise((resolve, reject) => {
    axios.patch(url, data)
      .then(response => {
        resolve(response.data);
      }, err => {
        reject(err)
      })
  })
}

/**
 * 封装put请求
 * @param url
 * @param data
 * @returns {Promise}
 */

export function put(url, data = {}) {
  return new Promise((resolve, reject) => {
    axios.put(url, data)
      .then(response => {
        resolve(response.data);
      }, err => {
        reject(err)
      })
  })
}

/**
 * 封装delete方法
 * @param url
 * @param data
 * @returns {Promise}
 */

export function Delete(url, params = {}) {
  return new Promise((resolve, reject) => {
    axios.delete(url, {
      data: params
    })
      .then(response => {
        if (response) {
          resolve(response.data);
        }
      })
      .catch(err => {
        reject(err)
      })
  })
}
/**
 * 封装delete方法
 * @param url
 * @param data
 * @returns {Promise}
 */
export function singleDelete(url, params = '') {
  return new Promise((resolve, reject) => {
    axios.delete(url + '/' + params)
    .then(response => {
      if (response) {
        resolve(response.data);
      }
    })
    .catch(err => {
      reject(err)
    })
  })
}

/**
 * 封装上传头像方法
 * @param url
 * @param data
 * @returns {Promise}
 */

export function upload(Url, data) {
  let token = JSON.parse(authorization());
  let instance = axios.create({
    baseURL: process.env.BASEURL,
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': token
    },
  });
  return new Promise((resolve, reject) => {
    instance.post(Url, data).then(response => {
      if (response) {
        resolve(response.data)
      }
    }).catch(error => {
      reject(error)
    })
  })
}
