import axios from 'axios'
import Toast from './toast/index'
import JSONbig from 'json-bigint'

import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

const optionsLoading = {
  lock: true,
  text: '请求中...',
  spinner: 'el-icon-loading',
  background: 'rgba(0, 0, 0, 0.7)'
}

class RequestPromise extends Promise {
  dataToArray() {
    return this.then(data => {
      const { success } = this.options || {}

      if (success && data && data.code === 0) {
        Toast.success(data.message)
      }
      return [null, data]
    }).catch(err => {
      const { type } = this.options || {}
      if (type === 'toast' && err) {
        Toast.$toast(err.message)
      } else if (err && this.options) {
        Toast.error(err.message)
      }
      return [err]
    })
  }

  message(options) {
    this.options = options || {}

    return this
  }
}

const pending = []
const CancelToken = axios.CancelToken

const cancelPending = (config) => {
  pending.forEach((item, index) => {
    if (config) {
      if (item.UrlPath === config.url && JSON.stringify(item.params) === JSON.stringify(config.params)) {
        item.Cancel() // 取消请求
        pending.splice(index, 1) // 移除当前请求记录
      }
    } else {
      item.Cancel() // 取消请求
      pending.splice(index, 1) // 移除当前请求记录
    }
  })
}

const jsonBig = new JSONbig({ storeAsString: true })

let needLoadingRequestCount = 0
let loadingInstance = null

// Vue.prototype._cancels_ = []

export class BaseRequest {
  constructor(options = {}) {
    this.options = options
    this._request = axios.create({
      timeout: options.timeout || (60000 * 3)
    })
    this._request.defaults.withCredentials = true

    // request interceptor
    this._request.interceptors.request.use(
      config => {
        const screen = {
          width: document.body.clientWidth,
          height: document.body.clientHeight
        }

        const t = new Date().getTime()
        const header = {
          'X-Mall-Version': this.options.version, // 年 月 日
          'X-Mall-User-Agent': 'web',
          'X-Mall-Time': t,
          'X-Mall-Nonce': t + Math.random() * 10000000 + '',
          'X-Mall-Screen': JSON.stringify(screen)
        }
        config.headers = Object.assign(config.headers, header)

        config.url = this.completeUrl(config.url)
        // do something before request is sent
        config.transformResponse = function(data) {
          return jsonBig.parse(data)
        }

        if (config.showLoading === 'circle') {
          // 加载圆形Loading
          showFullScreenLoading()
        } else if (config.showLoading === 'step') {
          // 加载进度Loading
          NProgress.start()
        }
        if (
          config.url.indexOf('seller/upload/policy') === -1 && // 上传策略
          config.url.indexOf('buyer/form-template/validate') === -1 && // 加入购物车需要多次
          config.url.indexOf('tools/form/replace') === -1 // 地址转换
        ) {
          cancelPending(config)
        }
        config.cancelToken = new CancelToken(res => {
          pending.push({ 'UrlPath': config.url, 'Cancel': res, ...config })
        })

        // new axios.CancelToken((c) => {
        //   Vue.prototype._cancels_.push(c)
        // })

        return config
      },
      error => {
        // do something with request error
        console.log(error) // for debug
        return Promise.reject(error)
      }
    )

    // response interceptor
    this._request.interceptors.response.use(
      response => {
        if (response.config.showLoading === 'circle') {
          // 加载圆形Loading
          tryHideFullScreenLoading()
        } else if (response.config.showLoading === 'step') {
          // 关闭进度Loading
          NProgress.done()
        }
        if (
          response.config.url.indexOf('seller/upload/policy') === -1 &&
          response.config.url.indexOf('buyer/form-template/validate') === -1 &&
          response.config.url.indexOf('tools/form/replace') === -1 // 地址转换
        ) {
          cancelPending(response.config)
        }
        tryHideFullScreenLoading()
        return response.data
      },
      error => {
        // 权限不足时全局错误提示
        if (error.response && error.response.data.code === 20004) {
          Toast.error(error.response.data.message)
        }
        if (error.config && error.config.showLoading === 'circle') {
          // 加载圆形Loading
          tryHideFullScreenLoading()
        } else if (error.config && error.config.showLoading === 'step') {
          // 关闭进度Loading
          NProgress.done()
        }
        console.log('err' + error.response) // for debug
        if (!error.response) {
          return Promise.reject(error)
        }

        const data = error.response.data
        // if (data.status === 403 && data.message) {
        //   Message({
        //     message: data.message,
        //     type: 'error',
        //     duration: 4 * 1000
        //   })
        // } else if (data.status === 401) {
        //   //
        // }

        return Promise.reject(data)
      }
    )
  }

  completeUrl(url) {
    if (url.includes('http://') || url.includes('https://')) {
      return url
    }
    return this.completeUrlTransform(url)
  }

  getUrl(url) {
    if (url.includes('http://') || url.includes('https://')) {
      return url
    }
    return this.urlModuleTransform(url)
  }

  completeUrlTransform(url) {
    let domain
    try {
      domain = window.domain_config.api_domain.domain
    } catch (error) {
      domain = 'hulihuzhu.com'
    }
    let secure
    try {
      secure = window.domain_config.api_domain.secure
    } catch (error) {
      secure = 'http://'
    }
    return secure + url.replace('{{domain}}', domain)
  }

  // 请求地址根据模块不同读取配置
  urlModuleTransform(url) {
    const moduleSubDomain = this.options.sub_module_domain
    if (!moduleSubDomain) {
      console.warn('>>>>>>>>>>>>悉知：当前请求模块二级域名未配置<<<<<<<<<<<<')
    }
    return moduleSubDomain + '.{{domain}}' + url
  }

  get(url, query, config = {}) {
    return new RequestPromise((resolve, reject) => {
      resolve(this._request.get(this.getUrl(url), { params: query, ...config }))
    })
  }
  getShowStep(url, query) {
    return new RequestPromise((resolve, reject) => {
      resolve(this._request.get(this.getUrl(url), { params: query, showLoading: 'step' }))
    })
  }
  getShowCircle(url, query) {
    return new RequestPromise((resolve, reject) => {
      resolve(this._request.get(this.getUrl(url), { params: query, showLoading: 'circle' }))
    })
  }
  post(url, params, config = {}) {
    return new RequestPromise((resolve, reject) => {
      resolve(this._request.post(this.getUrl(url), params, config))
    })
  }
  postShowStep(url, params, config = { showLoading: 'step' }) {
    return new RequestPromise((resolve, reject) => {
      resolve(this._request.post(this.getUrl(url), params, config))
    })
  }
  postShowCircle(url, params, config = { showLoading: 'circle' }) {
    return new RequestPromise((resolve, reject) => {
      resolve(this._request.post(this.getUrl(url), params, config))
    })
  }
  put(url, params) {
    return new RequestPromise((resolve, reject) => {
      resolve(this._request.put(this.getUrl(url), params))
    })
  }
  delete(url) {
    return new RequestPromise((resolve, reject) => {
      resolve(this._request.delete(this.getUrl(url)))
    })
  }
  deleteShowStep(url) {
    return new RequestPromise((resolve, reject) => {
      resolve(this._request.delete(this.getUrl(url), { showLoading: 'step' }))
    })
  }
  deleteShowCircle(url) {
    return new RequestPromise((resolve, reject) => {
      resolve(this._request.delete(this.getUrl(url), { showLoading: 'circle' }))
    })
  }
}

function showFullScreenLoading() {
  if (needLoadingRequestCount === 0) {
    loadingInstance = Loading.service(optionsLoading)
  }
  needLoadingRequestCount++
}

function tryHideFullScreenLoading() {
  if (needLoadingRequestCount <= 0) return
  needLoadingRequestCount--
  if (needLoadingRequestCount === 0) {
    setTimeout(tryCloseLoading, 300)/* 300ms 间隔内的 loading 合并为一次*/
  }
}
const tryCloseLoading = () => {
  if (needLoadingRequestCount === 0) {
    loadingInstance.close()
  }
}

window.BaseRequest = BaseRequest
