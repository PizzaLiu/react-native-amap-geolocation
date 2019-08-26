const react_native = require("react-native");
const AMapGeolocation = react_native.NativeModules.AMapGeolocation;
const eventEmitter = new react_native.NativeEventEmitter(AMapGeolocation);

let watchId = 0;
let watchMap = {};
const toPosition = function (location) {
  return {
    location: location,
    coords: {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      accuracy: location.accuracy,
      altitudeAccuracy: null,
      heading: location.heading,
      speed: location.speed
    },
    timestamp: location.timestamp
  };
};

/**
 * 定位结果类型
 *
 * @platform android
 */
const LocationType = {
  /**
  * 卫星定位结果
  *
  * 通过设备卫星定位模块返回的定位结果
  */
  GPS: 1,
  /**
  * 前次定位结果
  *
  * 网络定位请求低于1秒、或两次定位之间设备位置变化非常小时返回，设备位移通过传感器感知
  */
  SAME_REQ: 2,
  /**
  * @deprecated
  */
  FAST: 3,
  /**
  * 缓存定位结果
  *
  * 返回一段时间前设备在相同的环境中缓存下来的网络定位结果，节省无必要的设备定位消耗
  */
  FIX_CACHE: 4,
  /**
  * Wifi定位结果
  *
  * 属于网络定位，定位精度相对基站定位会更好
  */
  WIFI: 5,
  /**
  * 基站定位结果
  *
  * 属于网络定位
  */
  CELL: 6,
  AMAP: 7,
  /**
  * 离线定位结果
  */
  OFFLINE: 8,
  /**
  * 最后位置缓存
  */
  LAST_LOCATION_CACHE: 9
};

/**
 * Android 错误代码
 *
 * @platform android
 */
const ErrorCodeAndroid = {
  /**
   * 定位成功
   */
  LOCATION_SUCCESS: 0,
  /**
   * 一些重要参数为空，可以通过 [[Location.locationDetail]] 获取详细信息
   */
  INVALID_PARAMETER: 1,
  /**
   * 定位失败，由于设备仅扫描到单个 wifi，不能精准的计算出位置信息
   */
  FAILURE_WIFI_INFO: 2,
  /**
   * 获取到的请求参数为空，可能获取过程中出现异常，可以通过 [[Location.locationDetail]] 获取详细信息
   */
  FAILURE_LOCATION_PARAMETER: 3,
  /**
   * 网络连接异常，可以通过 [[Location.locationDetail]] 获取详细信息
   */
  FAILURE_CONNECTION: 4,
  /**
   * 解析 XML 出错，可以通过 [[Location.locationDetail]] 获取详细信息
   */
  FAILURE_PARSER: 5,
  /**
   * 定位结果错误，可以通过 [[Location.locationDetail]] 获取详细信息
   */
  FAILURE_LOCATION: 6,
  /**
   * Key 错误，可以通过 [[Location.locationDetail]] 获取详细信息来跟注册的 Key 信息进行对照
   */
  FAILURE_AUTH: 7,
  /**
   * 其他错误，可以通过 [[Location.locationDetail]] 获取详细信息
   */
  UNKNOWN: 8,
  /**
   * 初始化异常，可以通过 [[Location.locationDetail]] 获取详细信息
   */
  FAILURE_INIT: 9,
  /**
   * 定位服务启动失败，请检查是否配置 service 并且 manifest 中 service 标签是否配置在 application 标签内
   */
  SERVICE_FAIL: 10,
  /**
   * 错误的基站信息，请检查是否安装 sim 卡
   */
  FAILURE_CELL: 11,
  /**
   * 缺少定位权限，请检查是否配置定位权限，并在安全软件和设置中给应用打开定位权限
   */
  FAILURE_LOCATION_PERMISSION: 12,
  /**
   * 网络定位失败，请检查设备是否插入 sim 卡、开启移动网络或开启了 wifi 模块
   */
  FAILURE_NOWIFIANDAP: 13,
  /**
   * 卫星定位失败，可用卫星数不足
   */
  FAILURE_NOENOUGHSATELLITES: 14,
  /**
   * 定位位置可能被模拟
   */
  FAILURE_SIMULATION_LOCATION: 15,
  /**
   * 定位失败，飞行模式下关闭了 wifi 开关，请关闭飞行模式或者打开 wifi 开关
   */
  AIRPLANEMODE_WIFIOFF: 18,
  /**
   * 定位失败，没有检查到 sim 卡，并且关闭了 wifi 开关，请打开 wifi 开关或者插入 sim 卡
   */
  NOCGI_WIFIOFF: 19,
};

/**
 * iOS 错误代码
 *
 * @platform ios
 */
const ErrorCodeIOS = {};

/**
 * 定位错误信息
 *
 * @see https://developer.mozilla.org/zh-CN/docs/Web/API/PositionError
 */
class PositionError {
  constructor(code, message, location) {
    this.code = code;
    this.message = message;
    this.location = location;
  }
}

/**
 * 定位模式，目前支持三种定位模式
 *
 * @platform android
 */
const LocationMode = {
  /**
   * 低功耗模式，在这种模式下，将只使用高德网络定位。
   */
  Battery_Saving: "Battery_Saving",
  /**
   * 仅设备模式，只使用卫星定位，不支持室内环境的定位
   */
  Device_Sensors: "Device_Sensors",
  /**
   * 高精度模式，在这种定位模式下，将同时使用高德网络定位和卫星定位，优先返回精度高的定位
   */
  Hight_Accuracy: "Hight_Accuracy"
};

/**
 * 定位场景
 *
 * @platform android
 */
const LocationPurpose = {
  /**
   * 签到场景
   *
   * 只进行一次定位返回最接近真实位置的定位结果（定位速度可能会延迟 1-3s）。
   */
  SignIn: "SignIn",
  /**
   * 运动场景
   *
   * 高精度连续定位，适用于有户内外切换的场景，卫星定位和网络定位相互切换，卫星定位成功之后网络定位不再返回，卫星信号断开之后一段时间才会返回网络结果。
   */
  Sport: "Sport",
  /**
   * 出行场景
   *
   * 高精度连续定位，适用于有户内外切换的场景，卫星定位和网络定位相互切换，卫星定位成功之后网络定位不再返回，卫星信号断开之后一段时间才会返回网络结果。
   */
  Transport: "Transport"
};

/**
 * 逆地理编码语言
 */
const GeoLanguage = {
  /**
   * 默认，根据位置按照相应的语言返回逆地理信息，在国外按英语返回，在国内按中文返回
   */
  DEFAULT: "DEFAULT",
  /**
   * 中文，无论在国外还是国内都为返回中文的逆地理信息
   */
  ZH: "ZH",
  /**
   * 英文，无论在国外还是国内都为返回英文的逆地理信息
   */
  EN: "EN"
};

/**
 * 卫星信号强度
 *
 * @platform android
 */
const GpsAccuracy = {
  UNKNOWN: 0,
  BAD: 1,
  GOOD: 2
};

/**
 * 定位结果的可信度
 */
const TrustedLevel = {
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  BAD: 4
};

class Geolocation {

  /**
   * 获取当前位置信息
   *
   * 注意：使用该方法会停止持续定位
   *
   * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Geolocation/getCurrentPosition
   */
  static getCurrentPosition(success, error, options) {
    const listener = Geolocation.addLocationListener(function (location) {
      if (location.errorCode) {
        error && error(new PositionError(location.errorCode, location.errorInfo, location));
      }
      else {
        success(toPosition(location));
      }
      Geolocation.stop();
      listener.remove();
    });
    Geolocation.start();
  };

  /**
   * 注册监听器进行持续定位
   *
   * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Geolocation/watchPosition
   */
  static watchPosition(success, error, options) {
    watchMap[++watchId] = Geolocation.addLocationListener(function (location) {
      if (location.errorCode) {
        error && error(new PositionError(location.errorCode, location.errorInfo, location));
      }
      else {
        success(toPosition(location));
      }
    });
    Geolocation.start();
    return watchId;
  };
  /**
   * 移除位置监听
   *
   * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Geolocation/clearWatch
   */
  static clearWatch(id) {
    const listener = watchMap[id];
    if (listener) {
      listener.remove();
    }
  };
  /**
   * 初始化 SDK
   *
   * @param key 高德开放平台应用 Key
   */
  static init(key) {
    return AMapGeolocation.init(react_native.Platform.select(key));
  }

  /**
   * 添加定位监听函数
   *
   * @param listener
   */
  static addLocationListener(listener) {
    return eventEmitter.addListener("AMapGeolocation", listener);
  }

  /**
   * 开始持续定位
   */
  static start() {
    AMapGeolocation.start();
  }

  /**
   * 停止持续定位
   */
  static stop() {
    AMapGeolocation.stop();
  }

  /**
   * 获取当前是否正在定位的状态
   */
  static isStarted() {
    return AMapGeolocation.isStarted();
  }

  /**
   * 设置发起定位请求的时间间隔（毫秒），默认 2000，最小值为 1000
   *
   * @default 2000
   * @platform android
   */
  static setInterval(interval) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setInterval(interval);
    }
  }

  /**
   * 设置是否单次定位
   *
   * @default false
   * @platform android
   */
  static setOnceLocation(isOnceLocation) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setOnceLocation(isOnceLocation);
    }
  }

  /**
   * 设置是否允许调用 WiFi 刷新
   *
   * 当设置为 `false` 时会停止主动调用 wifi 刷新，将会极大程度影响定位精度，
   * 但可以有效的降低定位耗电。
   *
   * @default true
   * @platform android
   */
  static setWifiScan(isWifiScan) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setWifiScan(isWifiScan);
    }
  }

  /**
   * 设置是否使用设备传感器
   *
   * @default false
   * @platform android
   */
  static setSensorEnable(enable) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setSensorEnable(enable);
    }
  }

  /**
   * 设置是否开启wifi始终扫描
   *
   * 只有设置了 `android.permission.WRITE_SECURE_SETTINGS` 权限后才会开启。
   * 开启后，即使关闭 wifi 开关的情况下也会扫描 wifi。
   * 此方法为静态方法，设置一次后其他定位 client 也会生效。
   *
   * @default true
   * @platform android
   */
  static setOpenAlwaysScanWifi(isOpen) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setOpenAlwaysScanWifi(isOpen);
    }
  }

  /**
   * 设置定位是否等待 WiFi 列表刷新
   *
   * 定位精度会更高，但是定位速度会变慢 1-3 秒，
   * 当设置为 `true` 时，连续定位会自动变为单次定位。
   *
   * @default false
   * @platform android
   */
  static setOnceLocationLatest(isOnceLocationLatest) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setOnceLocationLatest(isOnceLocationLatest);
    }
  }
  /**
   * 设置是否返回地址信息，默认返回地址信息
   *
   * GPS 定位时也可以返回地址信息，但需要网络通畅，第一次有可能没有地址信息返回。
   *
   * @default true
   * @platform android
   */
  static setNeedAddress(isNeedAddress) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setNeedAddress(isNeedAddress);
    }
  }

  /**
   * 设置是否允许模拟位置
   *
   * @default true
   * @platform android
   */
  static setMockEnable(enable) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setMockEnable(enable);
    }
  }

  /**
   * 设置是否使用缓存策略
   *
   * @default true
   * @platform android
   */
  static setLocationCacheEnable(enable) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setLocationCacheEnable(enable);
    }
  }
  /**
   * 设置联网超时时间（毫秒）
   *
   * @default 30000
   * @platform android
   */
  static setHttpTimeout(timeout) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setHttpTimeout(timeout);
    }
  }

  /**
   * 设置优先返回卫星定位信息时等待卫星定位结果的超时时间（毫秒）
   *
   * 只有在 `setGpsFirst(true)` 时才有效。
   *
   * @platform android
   */
  static setGpsFirstTimeout(timeout) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setGpsFirstTimeout(timeout);
    }
  }

  /**
   * 设置首次定位是否等待卫星定位结果
   *
   * 只有在单次定位高精度定位模式下有效，设置为 `true` 时，会等待卫星定位结果返回，
   * 最多等待 30 秒，若 30 秒后仍无卫星定位结果返回，返回网络定位结果。
   * 等待卫星定位结果返回的时间可以通过 [[setGpsFirstTimeout]] 进行设置。
   *
   * @default false
   * @platform android
   */
  static setGpsFirst(isGpsFirst) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setGpsFirst(isGpsFirst);
    }
  }

  /**
   * 设置定位模式
   *
   * @platform android
   */
  static setLocationMode(mode) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setLocationMode(mode);
    }
  }

  /**
   * 设置定位场景
   *
   * 根据场景快速修改 option，不支持动态改变，修改后需要调用 [[start]] 使其生效，当不需要场景时，可以设置为 `null`。
   *
   * 注意：不建议设置场景和自定义 option 混合使用。设置场景后，如果已经开始定位了，建议调用一次 [[stop]]，然后主动调用一次 [[start]]
   * 以保证 option 正确生效。当主动设置的 option 和场景中的 option 有冲突时，以后设置的为准，比如：签到场景中默认的为单次定位，
   * 当主动设置 option 为连续定位时，如果先设置的场景，后改变的 option，这时如果不调用 [[start]] 不会变为连续定位，
   * 如果调用了 [[start]] 则会变为连续定位，如果先改变 option，后设置场景为签到场景，则会变为单次定位。
   *
   * @platform android
   */
  static setLocationPurpose(purpose) {
    if (react_native.Platform.OS === "android") {
      AMapGeolocation.setLocationPurpose(purpose);
    }
  }

  /**
   * 设置逆地理信息的语言，目前支持中文和英文
   *
   * @default GeoLanguage.DEFAULT
   */
  static setGeoLanguage(language) {
    AMapGeolocation.setGeoLanguage(language);
  }
  /**
   * 设定定位的最小更新距离（米）
   *
   * 默认为 `kCLDistanceFilterNone`，表示只要检测到设备位置发生变化就会更新位置信息。
   *
   * @platform ios
   */
  static setDistanceFilter(distance) {
    if (react_native.Platform.OS === "ios") {
      AMapGeolocation.setDistanceFilter(distance);
    }
  }
  /**
   * 设定期望的定位精度（米）
   *
   * 默认为 `kCLLocationAccuracyBest`。
   * 定位服务会尽可能去获取满足 `desiredAccuracy` 的定位结果，但不保证一定会得到满足期望的结果。
   *
   * 注意：设置为 `kCLLocationAccuracyBest` 或 `kCLLocationAccuracyBestForNavigation` 时，
   * 单次定位会在达到 `locationTimeout` 设定的时间后，将时间内获取到的最高精度的定位结果返回。
   *
   * @platform ios
   */
  static setDesiredAccuracy(desiredAccuracy) {
    if (react_native.Platform.OS === "ios") {
      AMapGeolocation.setDesiredAccuracy(desiredAccuracy);
    }
  }
  /**
   * 指定定位是否会被系统自动暂停
   *
   * @default false
   * @platform ios
   */
  static setPausesLocationUpdatesAutomatically(isPause) {
    if (react_native.Platform.OS === "ios") {
      AMapGeolocation.setPausesLocationUpdatesAutomatically(isPause);
    }
  }
  /**
   * 是否允许后台定位
   *
   * 只在iOS 9.0 及之后起作用。
   * 设置为YES的时候必须保证 `Background Modes` 中的 `Location updates` 处于选中状态，否则会抛出异常。
   * 由于iOS系统限制，需要在定位未开始之前或定位停止之后，修改该属性的值才会有效果。
   *
   * @default false
   * @platform ios
   */
  static setAllowsBackgroundLocationUpdates(isAllow) {
    if (react_native.Platform.OS === "ios") {
      AMapGeolocation.setAllowsBackgroundLocationUpdates(isAllow);
    }
  }

  /**
   * 指定单次定位超时时间（秒）
   *
   * 最小值是 2s。注意在单次定位请求前设置。
   *
   * 注意: 单次定位超时时间从确定了定位权限（非 `kCLAuthorizationStatusNotDetermined` 状态）后开始计算。
   *
   * @default 10
   * @platform ios
   */
  static setLocationTimeout(timeout) {
    if (react_native.Platform.OS === "ios") {
      AMapGeolocation.setLocationTimeout(timeout);
    }
  }

  /**
   * 指定单次定位逆地理超时时间（秒）
   *
   * 最小值是 2s。注意在单次定位请求前设置。
   *
   * @default 5
   * @platform ios
   */
  static setReGeocodeTimeout(timeout) {
    if (react_native.Platform.OS === "ios") {
      AMapGeolocation.setReGeocodeTimeout(timeout);
    }
  }

  /**
   * 连续定位是否返回逆地理编码
   *
   * @default false
   * @platform ios
   */
  static setLocatingWithReGeocode(withReGeocode) {
    if (react_native.Platform.OS === "ios") {
      AMapGeolocation.setLocatingWithReGeocode(withReGeocode);
    }
  }
}


Geolocation.LocationType = LocationType;
Geolocation.ErrorCodeAndroid = ErrorCodeAndroid;
Geolocation.ErrorCodeIOS = ErrorCodeIOS;
Geolocation.LocationMode = LocationMode;
Geolocation.LocationPurpose = LocationPurpose;
Geolocation.GeoLanguage = GeoLanguage;
Geolocation.GpsAccuracy = GpsAccuracy;
Geolocation.TrustedLevel = TrustedLevel;

module.exports = Geolocation;
