import http from "k6/http";
import { check } from "k6";
import encoding from "k6/encoding";

const properties = JSON.parse(open("./properties.json"));

export const options = {
  vus: 1,
  iterations: 1,
};

export function setup() {
  let FORM_DATA = {
    "loginSearchBean.userId": properties.USER_ID,
    "loginSearchBean.password": encoding.b64encode(properties.PASSWORD),
    "loginSearchBean.loginType": "S",
    "loginSearchBean.loginKind": "",
    "loginSearchBean.loginKindSub": "",
  };

  // 로그인 및 세션 쿠키 값 추출 (복지관 세션 쿠키 : '__KSMSID_USER__')
  let res = http.post(properties.LOGIN_ACTION_API, FORM_DATA);
  const SESSION_COOKIE_VALUE = res.cookies.__KSMSID_USER__[0].value;

  let jar = http.cookieJar();
  let cookies = jar.cookiesForURL("properties.LOGIN_ACTION_API");
  console.log(cookies);

  return SESSION_COOKIE_VALUE;
}

export default function (SESSION_COOKIE_VALUE) {
  console.log(SESSION_COOKIE_VALUE);

  let res = http.get(properties.MAIN_PAGE_URL, {
    cookies: {
      __KSMSID_USER__: SESSION_COOKIE_VALUE,
    },
  });

  console.log(res.cookies.EZWEL_USER_KEY[0].value);
}
