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

  /**
   * 로그인 요청시 'loginAction.ez'(302) 응답 후 'main.ez?pc'(200)으로 리다이렉션 된다.
   * 'res' 변수에는 결과적으로 최종 응답인 'main.ez?pc(200)'이 담긴다.
   * 'loginAction.ez'(302) 응답이 필요한 경우 옵션으로 '{redirects: 0}'을 명시하여 받을 수 있다.
   * 'EZWEL_USER_KEY' 쿠키는 'loginAction.ez'(302) 응답 헤더에 담겨있기 때문에 아래와 같이 처리하였다.
   */
  let res = http.post(properties.LOGIN_ACTION_API, FORM_DATA, { redirects: 0 });

  const SESSION_COOKIE_VALUE = res.cookies.__KSMSID_USER__[0].value;
  const EZWEL_USER_KEY = res.cookies.EZWEL_USER_KEY[0].value;

  return {
    SESSION_COOKIE_VALUE: SESSION_COOKIE_VALUE,
    EZWEL_USER_KEY: EZWEL_USER_KEY,
  };
}

export default function (COKKIES) {
  console.log(COKKIES.SESSION_COOKIE_VALUE);
  console.log(COKKIES.EZWEL_USER_KEY);
  // let res = http.get(properties.MAIN_PAGE_URL, {
  //   cookies: {
  //     __KSMSID_USER__: SESSION_COOKIE_VALUE,
  //   },
  // });
}
