import './index.css'
/**
 * 自定义 提示框( Toast )组件
 */
var Toast = {}
var showToast = false // 存储toast显示状态
var showLoad = false // 存储loading显示状态
var toastVM = null // 存储toast vm
var loadNode = null // 存储loading节点元素

Toast.install = function(Vue, options) {
  // 参数
  var opt = {
    defaultType: 'center',
    duration: '2500',
    wordWrap: false
  }
  for (var property in options) {
    opt[property] = options[property]
  }

  Vue.prototype.$toast = function(tips, type) {
    if (!tips) return
    var curType = type || opt.defaultType
    var wordWrap = opt.wordWrap ? 'lx-word-wrap' : ''
    var style = opt.width ? 'style="width: ' + opt.width + '"' : ''
    var icon
    var tmp = '<div v-show="show" :class="type" class="lx-toast ' + wordWrap + '" ' + style + '>{{tip}}</div>'
    if (type === 'success') {
      icon = require('./img/success.png')
    } else if (type === 'error') {
      icon = require('./img/error.png')
    }

    if (type === 'success' || type === 'error') {
      tmp = '<div v-show="show" :class="type" class="lx-toast-icon lx-toast-center"><img class="icon" :src="icon"/><p>{{tip}}</p></div>'
    }

    if (showToast) {
      // 如果toast还在，则不再执行
      return
    }
    const tmpRes = Vue.compile(tmp)
    var ToastTpl = Vue.extend({
      data: function() {
        return {
          show: showToast,
          tip: tips || '',
          type: 'lx-toast-' + curType,
          icon: icon
        }
      },
      render: tmpRes.render
      // template: tmp
    })
    toastVM = new ToastTpl()
    var tpl = toastVM.$mount().$el
    document.body.appendChild(tpl)

    toastVM.type = 'lx-toast-' + curType
    toastVM.tip = tips || ''
    toastVM.show = showToast = true

    setTimeout(function() {
      toastVM.show = showToast = false
      document.body.removeChild(toastVM.$el)
    }, opt.duration)
  };

  ['bottom', 'center', 'top', 'success', 'error'].forEach(function(type) {
    Vue.prototype.$toast[type] = function(tips) {
      return Vue.prototype.$toast(tips, type)
    }
  })

  Vue.prototype.$loading = function(tips, type) {
    if (type === 'close') {
      loadNode.show = showLoad = false
    } else {
      if (showLoad) {
        // 如果loading还在，则不再执行
        return
      }
      var loadingCls = tips ? 'lx-loading' : 'lx-loading no-text'
      var LoadTpl = Vue.extend({
        data: function() {
          return {
            show: showLoad,
            tip: tips,
            cls: loadingCls
          }
        },
        template: '<div v-show="show" class="lx-load-mark"><div class="lx-load-box"><div :class="cls"><div class="loading_leaf loading_leaf_0"></div><div class="loading_leaf loading_leaf_1"></div><div class="loading_leaf loading_leaf_2"></div><div class="loading_leaf loading_leaf_3"></div><div class="loading_leaf loading_leaf_4"></div><div class="loading_leaf loading_leaf_5"></div><div class="loading_leaf loading_leaf_6"></div><div class="loading_leaf loading_leaf_7"></div><div class="loading_leaf loading_leaf_8"></div><div class="loading_leaf loading_leaf_9"></div><div class="loading_leaf loading_leaf_10"></div><div class="loading_leaf loading_leaf_11"></div></div><div v-if="tip && tip.length" class="lx-load-content">' + tips + '</div></div></div>'
      })
      loadNode = new LoadTpl()
      var tpl = loadNode.$mount().$el

      document.body.appendChild(tpl)
      loadNode.show = showLoad = true
    }
  };

  ['open', 'close'].forEach(function(type) {
    Vue.prototype.$loading[type] = function(tips) {
      return Vue.prototype.$loading(tips, type)
    }
  })
}

// 向外暴露接口
export default Toast
