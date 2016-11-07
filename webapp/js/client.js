"use strict";
var Command;
(function (Command) {
    Command[Command["SendRegistrationMail"] = 0] = "SendRegistrationMail";
})(Command || (Command = {}));
var Status;
(function (Status) {
    Status[Status["Error"] = 0] = "Error";
    Status[Status["Ok"] = 1] = "Ok";
})(Status || (Status = {}));
var widgetCaptcha;
var captchaCallback = function (response) {
    console.log(response);
    var btn = (document.getElementById('button-login'));
    btn.disabled = false;
};
var onloadCallback = function () {
    widgetCaptcha = grecaptcha.render('divcaptcha', {
        sitekey: '6Lch0v4SAAAAAF9EtTI6Kb40Rvll5TnF4i-wFSjW',
        callback: captchaCallback
    });
};
var XSuccess = function (ev) {
    console.log(this.responseText);
    try {
        var response = JSON.parse(this.responseText);
        if (response.status === Status.Ok) {
            document.getElementById('success_display').className = 'shown';
            return;
        }
    }
    catch (e) {
        console.error('parsing error');
    }
    console.log('server error');
    document.getElementById('error_display').className = 'shown';
    document.getElementById('registration_form').className = 'shown';
};
var XSubmit = function (form) {
    var cResponse = grecaptcha.getResponse(widgetCaptcha);
    form.className = 'hidden';
    var xReq = new XMLHttpRequest();
    xReq.onload = XSuccess;
    var mailInput = document.getElementById('input_mail');
    var codeInput = document.getElementById('input_code');
    var data = {
        command: Command.SendRegistrationMail,
        mail: mailInput.value,
        code: codeInput.value,
        response: cResponse
    };
    console.log('captcha data');
    console.log(data);
    var jsonString = JSON.stringify(data);
    xReq.open("get", '/req?json=' + encodeURIComponent(jsonString), true);
    xReq.send();
};
//# sourceMappingURL=client.js.map