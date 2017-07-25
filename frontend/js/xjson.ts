"use strict";

function setUserSession(authId: string | false) {

  if (typeof authId === 'string') {
    let days = 1;
    var date = new Date();
    date.setTime(date.getTime() + cookieExpiration);
    document.cookie = 'authId=' + authId + '; expires=' + date.toUTCString();
    console.log('setUserAuth > identification ok, authId:' + authId + ' cookie:' + document.cookie);
  }
  else {
    // delete cookies
    document.cookie = 'authId=; expires=Thu, 01-Jan-70 00:00:01 GMT';
    console.info('setUserAuth > logout');
  }
}

function getUserSessionId(): string | false {
  if (document.cookie) {
    var res = document.cookie.match(/authId=(\w+)/);
    if (res != null && res.length == 2)
      return res[1];
  }
  return false;
}

function redirect(href: string, reason: ToStringId, confirmRedirection = false) {

  if (confirmRedirection) {
    if (confirm(i18n.x_messages[reason])) {
      document.location.href = href;
    }
  } else {
    if (reason) {
      if (i18n.x_messages[reason]) {
        alert(i18n.x_messages[reason]);
      }
      else {
        alert('Error code ' + reason);
      }
    }
    document.location.href = href;
  }
}

// CAPTCHA 
// https://developers.google.com/recaptcha/docs/

interface captchaWidget { }

interface Recaptcha {
  render: (container: string, param: {}) => captchaWidget,
  getResponse: (opt_widget_id?: captchaWidget) => string,
  reset: (opt_widget_id?: captchaWidget) => void,
}

declare var grecaptcha: Recaptcha;
var widgetCaptcha: captchaWidget;

var captchaCallback = function (response: string) {
  console.log(response);
  var btn = <HTMLButtonElement>(document.getElementById('signin_button'));
  btn.disabled = false;
}

var onloadCallback = function () {
  widgetCaptcha = grecaptcha.render('divcaptcha', {
    sitekey: '6Lch0v4SAAAAAF9EtTI6Kb40Rvll5TnF4i-wFSjW',
    callback: captchaCallback
  });
};

// XUserSessionAck ~ XRegistrationAck, XLoginAck, XCheckSessionAck, XCloseSessionAck
var XUserSessionAck: (this: XMLHttpRequest, ev: Event) => any = function (this: XMLHttpRequest, ev: Event): any {

  console.log('XUserSessionAck >' );
  console.log(this.responseText);

  let response: UserSessionAck | ErrorMessage;

  try {
    response = JSON.parse(this.responseText);
  }
  catch (e) {
    console.error('Parsing error in' + this.responseText);
    response = { type: MessageType.Error, toStringId: ToStringId.ServerError }
  }

  if (response && response.type === MessageType.User && response.userOptions.name) { // UserSessionAck

    
      if (response.closed) {
        setUserSession(false);
      }
      else {
        if (response.sessionId !== undefined) {
          setUserSession(response.sessionId);
        }
      }

    XClearError();
    XShowSuccess(response.userOptions.name);
    return; 
  }

  console.info('XUserSessionAck > Error, reset session');
  setUserSession(false);
  XShowError(i18n.x_messages[(<ErrorMessage>response).toStringId]);
}

var XSubmitRegistration = function (form: HTMLFormElement) {

  // let cResponse = grecaptcha.getResponse(widgetCaptcha);
  let cResponse = 'test';

  XClearError();
  form.style.visibility = 'hidden'; // hide form // TODO (5) : show back on timeout

  let xReq = new XMLHttpRequest();
  xReq.onload = XUserSessionAck;
  xReq.onerror = function (e) {
    console.error(e);
    XShowError(e.message);
    /* console.error(e);
     (<HTMLDivElement>document.getElementById('error_display')).style.visibility = 'visible'; // show error message
     (<HTMLFormElement>document.getElementById('login_form')).style.visibility = 'visible'; */
  }

  let nameInput: HTMLInputElement = <HTMLInputElement>document.getElementById('input_name');
  let mailInput: HTMLInputElement = <HTMLInputElement>document.getElementById('input_mail');
  let passwordInput: HTMLInputElement = <HTMLInputElement>document.getElementById('input_password');
  let dateInput: HTMLInputElement = <HTMLInputElement>document.getElementById('input_date');

  let data: XRegistrationRequest = {
    type: MessageType.Registration,
    name: nameInput.value,
    mail: mailInput.value,
    password: passwordInput.value,
    date: dateInput.valueAsDate,
    response: cResponse
  };

  xReq.open("get", '/req?json=' + encodeURIComponent(JSON.stringify(data)), true);
  xReq.send();
}

var XSubmitLogin = function (form: HTMLFormElement) {

  XClearError();
  form.style.visibility = 'hidden'; // hide form // TODO (5) : show back timeout

  let xReq = new XMLHttpRequest();
  xReq.onload = XUserSessionAck;
  xReq.onerror = function (e) {
    console.error(e);
    XShowError(e.message);
  }

  let loginInput: HTMLInputElement = <HTMLInputElement>document.getElementById('input_login');
  let passwordInput: HTMLInputElement = <HTMLInputElement>document.getElementById('input_password');

  let data: XLoginRequest = {
    type: MessageType.Login,
    login: loginInput.value,
    password: passwordInput.value,
  };

  xReq.open("get", '/req?json=' + encodeURIComponent(JSON.stringify(data)), true);
  xReq.send();
}

var XCheckSession = function (form: HTMLFormElement) {

  let sessionId = getUserSessionId();

  if (sessionId) {

    XClearError();

    form.style.visibility = 'hidden'; // hide form // TODO (5) : show back timeout

    let xReq = new XMLHttpRequest();
    xReq.onload = XUserSessionAck;
    xReq.onerror = function (e) {
      console.error(e);
      XShowError(e.message);
      setUserSession(false);
    }

    let data: SessionCheckRequest = {
      type: MessageType.SessionCheck,
      sessionId: sessionId,
      doClose: false
    };

    xReq.open("get", '/req?json=' + encodeURIComponent(JSON.stringify(data)), true);
    xReq.send();
  }
}

var XShowSuccess = function (username?: string) {
  console.log('XShowSuccess > ' + username);
  if (username) {
    (<HTMLDivElement>document.getElementById('user_name')).textContent = username;
  }
  (<HTMLDivElement>document.getElementById('success_display')).style.visibility = 'visible'; // show success message
}

var XShowError = function (message = i18n.x_messages[ToStringId.ServerError]) {
  console.log('XShowError > ' + message);
  let dispErr = <HTMLDivElement>document.getElementById('error_display');
  dispErr.textContent = message;
  dispErr.style.visibility = 'visible';
  let form = document.forms[0];
  if (form) {
    form.style.visibility = 'visible';
  }
}

var XClearError = function () {
  console.log('XClearError > ');
  let dispErr = <HTMLDivElement>document.getElementById('error_display');
  dispErr.textContent = '';
  dispErr.style.visibility = 'hidden';
}

var XCloseSession = function () {

  let sessionId = getUserSessionId();

  console.log('XCloseSession > sessionId: ' + sessionId );

  if (sessionId) {

    XClearError();

    let xReq = new XMLHttpRequest();
    xReq.onload = XUserSessionAck;
    xReq.onerror = function (e) {
      console.error(e);
      XShowError(e.message);
      setUserSession(false);
    }

    let data: SessionCheckRequest = {
      type: MessageType.SessionCheck,
      sessionId: sessionId,
      doClose: true
    };

    xReq.open("get", '/req?json=' + encodeURIComponent(JSON.stringify(data)), true);
    xReq.send();
  }
}


