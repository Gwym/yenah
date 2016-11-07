"use strict";

enum Command { SendRegistrationMail }
enum Status { Error, Ok }

// TODO (3) : DRY server/client configuration
interface jsonXRequest {
  command: Command,
  mail: string,
  code: string,
  response: string
}

interface jsonAck {
    status: Status
}


// CAPTCHA 
// https://developers.google.com/recaptcha/docs/

interface captchaWidget {}

interface Recaptcha { 
  render: (container: string, param: {} ) => captchaWidget,
  getResponse: (opt_widget_id?: captchaWidget) => string,
  reset: (opt_widget_id?: captchaWidget) => void,
}

declare var grecaptcha: Recaptcha; 
var widgetCaptcha: captchaWidget;

var captchaCallback = function(response: string) {
    console.log(response);
    var btn = <HTMLButtonElement>(document.getElementById('button-login'));
    btn.disabled = false;
}

var onloadCallback = function() {
  widgetCaptcha = grecaptcha.render('divcaptcha', {
    sitekey : '6Lch0v4SAAAAAF9EtTI6Kb40Rvll5TnF4i-wFSjW',
    callback: captchaCallback
  });
};


var XSuccess: (this: XMLHttpRequest, ev: Event) => any = function (this: XMLHttpRequest, ev: Event): any {
  console.log(this.responseText);
  try {
    var response: jsonAck = JSON.parse(this.responseText);
    if (response.status === Status.Ok) {
      (<HTMLDivElement>document.getElementById('success_display')).className = 'shown'; // show success message
      return;
    }
  }
  catch(e) {
    console.error('parsing error');
  }

  console.log('server error');
  (<HTMLDivElement>document.getElementById('error_display')).className = 'shown'; // show error message
  (<HTMLFormElement>document.getElementById('registration_form')).className = 'shown'; // show error message
}

var XSubmit = function (form: HTMLFormElement) {

  var cResponse = grecaptcha.getResponse(widgetCaptcha);

  form.className = 'hidden'; // hide form // TODO (5) : timeout

  var xReq = new XMLHttpRequest();
  xReq.onload = XSuccess;

  var mailInput: HTMLInputElement = <HTMLInputElement>document.getElementById('input_mail');
  var codeInput: HTMLInputElement = <HTMLInputElement>document.getElementById('input_code');

  var data:jsonXRequest = {
    command: Command.SendRegistrationMail,
    mail: mailInput.value,
    code: codeInput.value,
    response: cResponse
  };

  console.log('captcha data');
  console.log(data);

  var jsonString = JSON.stringify(data);

  xReq.open("get", '/req?json=' + encodeURIComponent(jsonString) , true);
  xReq.send();
}


