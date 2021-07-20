odoo.define('pos_keyboard.pos', function (require) {
    "use strict";

    var core = require('web.core');
    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');

    var _super_posmodel = models.PosModel.prototype;
    models.PosModel = models.PosModel.extend({
        initialize: function (session, attributes) {
            this.keypad = new Keypad({'pos': this});
            return _super_posmodel.initialize.call(this, session, attributes);
        }
    });

    screens.NumpadWidget.include({
        start: function() {
            this._super();
            var self = this;
            this.pos.keypad.set_action_callback(function(data){
                 self.keypad_action(data, self.pos.keypad.type);
            });
        },
        keypad_action: function(data, type){
             if (data.type === type.numchar){
                 this.state.appendNewChar(data.val);
             }
             else if (data.type === type.bmode) {
                 this.state.changeMode(data.val);
             }
             else if (data.type === type.sign){
                 this.clickSwitchSign();
             }
             else if (data.type === type.backspace){
                 this.clickDeleteLastChar();
             }
            else if (data.type === type.search){
                 var search = document.querySelector('.searchbox input');
                 console.log("input-search",search);
                 search.focus();
             }
             else if (data.type === type.pay){
                 document.querySelector('.actionpad .pay').click();
             }
            else if (data.type === type.change_table){
                 document.querySelector('.change-floor-button').click();
             }
            else if (data.type === type.return_table){
                 document.querySelector('.floor-button').click();
             }
            else if (data.type === type.stop_time){
                 document.querySelector('.control-button .reloj').click();
             }
             else if (data.type === type.add_couple){
                 document.querySelector('.control-button .add_couple').click();
             }
            else if (data.type === type.get_total){
                 document.querySelector('.get_total').click();
             }
        }
    });
    
    screens.PaymentScreenWidget.include({
        show: function(){
            this._super();
            this.pos.keypad.disconnect();
        },
        hide: function(){
            this._super();
            this.pos.keypad.connect();
        }
    });
    
    // this module mimics a keypad-only cash register. Use connect() and 
    // disconnect() to activate and deactivate it.
    var Keypad = core.Class.extend({
        init: function(attributes){
            this.pos = attributes.pos;
            /*this.pos_widget = this.pos.pos_widget;*/
            this.type = {
                numchar: 'number, dot',
                bmode: 'quantity, discount, price',
                sign: '+, -',
                search: 'search',
                backspace: 'backspace',
                pay:'pay',
                change_table: 'change_table',
                return_table : 'return_table',
                stop_time : 'stop_time',
                add_couple: 'add_couple',
                get_total : 'get_total'
            };
            this.data = {
                type: undefined,
                val: undefined
            };
            this.action_callback = undefined;
        },

        save_callback: function(){
            this.saved_callback_stack.push(this.action_callback);
        },

        restore_callback: function(){
            if (this.saved_callback_stack.length > 0) {
                this.action_callback = this.saved_callback_stack.pop();
            }
        },

        set_action_callback: function(callback){
            this.action_callback = callback;
        },

        //remove action callback
        reset_action_callback: function(){
            this.action_callback = undefined;
        },

        // starts catching keyboard events and tries to interpret keystrokes,
        // calling the callback when needed.
        connect: function(){
            var self = this;
            // --- additional keyboard ---//
            
            var KC_PLU = 107;      // KeyCode: + or - (Keypad '+')
            var KC_QTY = 111;      // KeyCode: Quantity (Keypad '/')
            var KC_AMT = 106;      // KeyCode: Price (Keypad '*')
            var KC_DISC = 109;     // KeyCode: Discount Percentage [0..100] (Keypad '-')
            var KC_SEARCH = 66;  //keyCode: Search new products (keypad 'b')
            var KC_PAY = 13;    //keyCode: Pay order (enter)
            var KC_CT = 9;      //keyCode: Change table (tab)
            var KC_RT = 16;     //keyCode : Return to all the rooms (shift)
            var KC_STOP = 87;   //keyCode : Stop the time on the room (keypad 'w')
            var KC_AC = 65;     //keyCode : Add couple to the room (keypad 'a')
            var KC_GT = 84;     //keyCode : Get Total of the order (keypad 't')
            // --- basic keyboard --- //
            var KC_PLU_1 = 83;    // KeyCode: sign + or - (Keypad 's')
            var KC_QTY_1 = 81;     // KeyCode: Quantity (Keypad 'q')
            var KC_AMT_1 = 80;     // KeyCode: Price (Keypad 'p')
            var KC_DISC_1 = 68;    // KeyCode: Discount Percentage [0..100] (Keypad 'd')


            var KC_BACKSPACE = 8;  // KeyCode: Backspace (Keypad 'backspace')
            var kc_lookup = {
                66:'b' , 48: '0', 49: '1', 50: '2',  51: '3', 52: '4',
                53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
                80: 'p', 83: 's', 68: 'd', 190: '.', 81: 'q',
                96: '0', 97: '1', 98: '2',  99: '3', 100: '4',
                101: '5', 102: '6', 103: '7', 104: '8', 105: '9',
                106: '*', 107: '+', 109: '-', 110: '.', 111: '/'
            };

            //usb keyboard keyup event
            var rx = /INPUT|SELECT|TEXTAREA/i;
            var ok = false;
            var timeStamp = 0;
            $('body').on('keyup', '', function (e){
                var statusHandler  =  !rx.test(e.target.tagName)  ||
                    e.target.disabled || e.target.readOnly;
                if (statusHandler){
                    var is_number = false;
                    var type = self.type;
                    var buttonMode = {
                        qty: 'quantity',
                        disc: 'discount',
                        price: 'price'
                    };
                    var token = e.keyCode;
                    if ((token >= 96 && token <= 105 || token == 110) ||
                        (token >= 48 && token <= 57 || token == 190)) {
                        self.data.type = type.numchar;
                        self.data.val = kc_lookup[token];
                        is_number = true;
                        ok = true;
                    }
                    else if(token == KC_CT){
                        self.data.type = type.change_table;
                        ok = true;
                    }
                    else if(token == KC_STOP){
                        self.data.type = type.stop_time;
                        ok = true;
                    }
                    else if(token == KC_AC){
                        self.data.type = type.add_couple;
                        ok = true;
                    }

                else if(token == KC_GT){
                        self.data.type = type.get_total;
                        ok = true;
                    }
                    else if(token == KC_RT){
                        self.data.type = type.return_table;
                        ok = true;
                    }
                    else if (token == KC_PAY){
                        self.data.type = type.pay;
                        ok = true;
                    }
                    else if(token == KC_SEARCH){
                        self.data.type = type.search ;
                        ok = true;
                    }
                    else if (token == KC_PLU || token == KC_PLU_1) {
                        self.data.type = type.sign;
                        ok = true;
                    }
                    else if (token == KC_QTY || token == KC_QTY_1) {
                        self.data.type = type.bmode;
                        self.data.val = buttonMode.qty;
                        ok = true;
                    }
                    else if (token == KC_AMT || token == KC_AMT_1) {
                        self.data.type = type.bmode;
                        self.data.val = buttonMode.price;
                        ok = true;
                    }
                    else if (token == KC_DISC || token == KC_DISC_1) {
                        self.data.type = type.bmode;
                        self.data.val = buttonMode.disc;
                        ok = true;
                    }
                    else if (token == KC_BACKSPACE) {
                        self.data.type = type.backspace;
                        ok = true;
                    } 
                    else {
                        self.data.type = undefined;
                        self.data.val = undefined;
                        ok = false;
                    } 

                    if (is_number) {
                        if (timeStamp + 50 > new Date().getTime()) {
                            ok = false;
                        }
                    }

                    timeStamp = new Date().getTime();

                    setTimeout(function(){
                        if (ok) {self.action_callback(self.data);}
                    }, 50);
                }
            });
        },

        // stops catching keyboard events 
        disconnect: function(){
            $('body').off('keyup', '');
        }
    });
    
    return {
        Keypad: Keypad
    };
});
