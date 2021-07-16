odoo.define('website_whatsapp_icon.whatsapp_icon', function (require) {
    'use strict';

    var rpc = require('web.rpc')
    var weContext = require('web_editor.context');

    $(document).ready(function() {
        $('#whatsapp_icon_main_div').hide();
        var button = $('#whatsapp_icon_div');
        var context = weContext.get();

        // Calling python function using rpc. Checking WhatsApp Icon Show is enabled or not.
        $(function(){
            rpc.query({
                model: 'website',
                method: 'is_show_whatsapp',
                args: [[context.website_id]]
                }).then( function (result) {
                    if (result == false) {
                        $('#whatsapp_icon_main_div').remove();
                    }
                    else {
                        $('#whatsapp_icon_main_div').show();
                        $(".wa_float").css("display", "block");
                    }
                });
        });

        // Calling python function using rpc. Redirecting to WhatsApp Web.
        button.click(function() {
            rpc.query({
                model: 'website',
                method: 'redirect_whatsapp_url',
                args: [[context.website_id]]
                }).then( function (result) {
                    window.open(result, '_blank');
                });
        });
    });
});
