"use strict";
var XSuccess = function (ev) {
    console.log(this.responseText);
};
var XSubmit = function (form) {
    var xReq = new XMLHttpRequest();
    xReq.onload = XSuccess;
    var mailInput = document.getElementById('input_mail');
    var codeInput = document.getElementById('input_code');
    var data = {
        mail: mailInput.value,
        code: codeInput.value
    };
    var jsonString = JSON.stringify(data);
    console.log('sending ' + jsonString);
    xReq.open("get", '/req?json=' + encodeURIComponent(jsonString), true);
    xReq.send();
};
//# sourceMappingURL=client.js.map