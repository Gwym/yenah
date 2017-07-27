

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

var loadCaptachaScript = function (src: string) {
  console.log('loading captcha script');
  let captchaScript = document.createElement('script');
  captchaScript.type = 'text/javascript';
  captchaScript.src = src;
  captchaScript.onload = function () {
    console.log('load captcha ok');
  };
  let container = document.getElementsByTagName('script')[0];
  if (container.parentNode) {
    container.parentNode.insertBefore(captchaScript, container);
  }
  else { console.error('no parentNode') }
}

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

  console.log('XUserSessionAck >');
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

  // TODO (0) : enable/disable captcha, password and code from server configuration
  // TODO (0) : enable/disable password/mail from server configuration
  // TODO (0) : enable/disable invitation code from server configuration

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

  let invitationCode: HTMLInputElement = <HTMLInputElement>document.getElementById('input_invitation_code');
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
    captchaResponse: cResponse,
    invitationCode: invitationCode.value
  };

  xReq.open("get", XJsonUrl + encodeURIComponent(JSON.stringify(data)), true);
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

  xReq.open("get", XJsonUrl + encodeURIComponent(JSON.stringify(data)), true);
  xReq.send();
}

// index.html onload 
// TODO (0) CORS
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

    xReq.open("get", XJsonUrl + encodeURIComponent(JSON.stringify(data)), true);
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

  console.log('XCloseSession > sessionId: ' + sessionId);

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

    xReq.open("get", XJsonUrl + encodeURIComponent(JSON.stringify(data)), true);
    xReq.send();
  }
}

// TODO (2) : split client.js by files (registration specific js) 
// FIXME (1) : initial configuration of hidden /visible elements is in style.css => set dynamically ?

// registration.html onload
// TODO (0) CORS
var xConfigureRegistration = function (form: HTMLFormElement) {

  let sessionId = getUserSessionId();

  if (sessionId) {
    console.log('already registred');
  }
  else {

    console.log('getting registration configuration');

    XClearError();

    (<HTMLElement>document.getElementById('registration_panel')).style.visibility = 'hidden';
    (<HTMLElement>document.getElementById('unallowed_display')).style.visibility = 'visible';

    let xReq = new XMLHttpRequest();
    xReq.onload = xConfigureRegistrationAck;
    xReq.onerror = function (e) {
      console.error(e);
      XShowError(e.message);
    }

    let data: XConfigureRegistrationRequest = {
      type: MessageType.ConfigureRegistration
    };

    xReq.open("get", XJsonUrl + encodeURIComponent(JSON.stringify(data)), true);
    xReq.send();
  }
}


var xConfigureRegistrationAck: (this: XMLHttpRequest, ev: Event) => any = function (this: XMLHttpRequest, ev: Event): any {

  console.log('xConfigureRegistrationAck >');
  console.log(this.responseText);

  let response: XConfigureRegistrationAck | ErrorMessage;

  try {
    response = JSON.parse(this.responseText);
  }
  catch (e) {
    console.error('Parsing error in' + this.responseText);
    response = { type: MessageType.Error, toStringId: ToStringId.ServerError }
  }

  if (response && response.type === MessageType.ConfigureRegistration) {

    XClearError();

    if (response.allowRegistration) {

      (<HTMLElement>document.getElementById('registration_panel')).style.visibility = 'visible';
      (<HTMLElement>document.getElementById('unallowed_display')).style.visibility = 'hidden';

      // FIXME (0) : set/unset required ?
      (<HTMLElement>document.getElementById('input_invitation_code')).style.visibility = response.doCheckInvitationCode ? 'visible' : 'hidden';

      if (response.doSendRegistrationMail) {
        (<HTMLElement>document.getElementById('password_panel')).style.visibility = 'hidden';
      }
      else {
        (<HTMLElement>document.getElementById('password_panel')).style.visibility = ''; // inherited from registration_panel
        // TODO (4) : password strength meter https://css-tricks.com/password-strength-meter/
        if (response.doCheckPasswordStrength) {
          let password_strength_meter = (<HTMLElement>document.getElementById('password_strength_meter'));
          password_strength_meter.style.visibility = ''; // inherited from password_panel
          let password_input = (<HTMLInputElement>document.getElementById('input_password'));
          password_input.addEventListener('input', function () {
            let val = password_input.value;
            let goodResult = checkPasswordStrenght(val);
            if (goodResult) {
              password_strength_meter.className = 'indication_strong_password';
            } else {
              password_strength_meter.className = 'indication_weak_password';
            }
          });
        }
        else {
          (<HTMLElement>document.getElementById('password_strength_meter')).style.visibility = 'hidden';
        }
      }

      if (response.doCheckCaptcha) {
        // TODO (1) : configuration response.captchaUrl ? or other vendors ?
        // <script src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit" async defer></script> 
        let captchaUrl = "https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit";
        loadCaptachaScript(captchaUrl);
        let captchaScriptLoader = document.createElement('script');
      }
    }
    else {
      (<HTMLElement>document.getElementById('registration_panel')).style.visibility = 'hidden';
      (<HTMLElement>document.getElementById('unallowed_display')).style.visibility = 'visible';
    }
    return;
  }
  else {
    if (!response || response && response.type !== MessageType.Error) {
      response = { type: MessageType.Error, toStringId: ToStringId.ServerError }
    }
  }

  console.info('xConfigureRegistrationAck > Error ' + response);
  XShowError(i18n.x_messages[(<ErrorMessage>response).toStringId]);
}



