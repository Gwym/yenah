"use strict";

var XSuccess: (this: XMLHttpRequest, ev: Event) => any = function (this: XMLHttpRequest, ev: Event): any {
  console.log(this.responseText);
}

var XSubmit = function (form: HTMLFormElement) {

  var xReq = new XMLHttpRequest();
  xReq.onload = XSuccess;

  var mailInput: HTMLInputElement = <HTMLInputElement>document.getElementById('input_mail');
  var codeInput: HTMLInputElement = <HTMLInputElement>document.getElementById('input_code');

  var data = {
    mail: mailInput.value,
    code: codeInput.value
  };

  var jsonString = JSON.stringify(data);

  console.log('sending ' + jsonString);

  xReq.open("get", '/req?json=' + encodeURIComponent(jsonString) , true);
  xReq.send();
}

