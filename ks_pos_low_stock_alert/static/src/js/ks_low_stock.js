/*
    @Author: KSOLVES India Private Limited
    @Email: sales@ksolves.com
*/

odoo.define('ks_pos_low_stock_alert.ks_low_stock', function (require) {
    "use strict";
    
    var rpc = require('web.rpc');
    var ks_models = require('point_of_sale.models');
    var ks_screens = require('point_of_sale.screens');
    var ks_utils = require('ks_pos_low_stock_alert.utils');
    // Nicolai: add qty_reservation
    ks_models.load_fields('product.product', ['type', 'qty_available', 'qty_reservation']);
    var ks_super_pos = ks_models.PosModel.prototype;
    var ks_super_orderline = ks_models.Orderline.prototype;
    // Nicolai
    var ks_super_numpadstate = ks_models.NumpadState.prototype;
    var core = require('web.core');
    var QWeb = core.qweb;
    // Nicolai
    
    var is_click;


    ks_models.PosModel = ks_models.PosModel.extend({
        initialize: function (session, attributes) {
            var self = this;
            this.ks_load_product_quantity_after_product();
            ks_super_pos.initialize.call(this, session, attributes);
            //Nicolai
            this.ready.then(function () {
                self.bus.add_channel_callback("pos_product_sync", self.update_product, self);
            });
        },
        update_product: function(data){
            var self = this;
            console.log(data);            
            var ks_products = self.db.product_by_id;
            for(var product_id in self.db.qty_by_product_id){
                if(product_id == data.products_ids[0]){
                    //var dif = parseInt(data.products_qty_reservation - ks_products[product_id].qty_reservation)
                    ks_products[product_id].qty_reservation = data.products_qty_reservation
                    if(data.action != "paid_order"){
                        ks_products[parseInt(product_id)].qty_available = data.products_qty_available - data.products_qty_reservation;
                    }                  
                    console.log('update_product',ks_products[product_id])
                    
                        $('span.quantity-reservation',`article[data-product-id="${ks_products[parseInt(product_id)].id}"]`).html('r: ' + ks_products[parseInt(product_id)].qty_reservation)
                        $('span.quantity-count',`article[data-product-id="${ks_products[parseInt(product_id)].id}"]`).html('d: ' + (ks_products[parseInt(product_id)].qty_available))    
                                        
                }
            }
        },
        // Fin Nicolai
        ks_get_model_reference: function (ks_model_name) {
            var ks_model_index = this.models.map(function (e) {
                return e.model;
            }).indexOf(ks_model_name);
            if (ks_model_index > -1) {
                return this.models[ks_model_index];
            }
            return false;
        },

        ks_load_product_quantity_after_product: function () {
            var ks_product_model = this.ks_get_model_reference('product.product');
            var ks_product_super_loaded = ks_product_model.loaded;
            ks_product_model.loaded = (self, ks_products) => {
                var done = $.Deferred();
                if(!self.config.allow_order_when_product_out_of_stock){
                    var ks_blocked_product_ids = [];
                    for(var i = 0; i < ks_products.length; i++){
                        if(ks_products[i].qty_available <= 0 && ks_products[i].type == 'product'){
                            ks_blocked_product_ids.push(ks_products[i].id);
                        }
                    }
                    var ks_blocked_products = ks_products.filter(function(p, index, arr) {
                        return ks_blocked_product_ids.includes(p.id);
                    });
                    ks_products = ks_products.concat(ks_blocked_products);
                }

                ks_product_super_loaded(self, ks_products);
                self.ks_update_qty_by_product_id(self, ks_products);
                done.resolve();
            }
        },

        ks_update_qty_by_product_id(self, ks_products){
            if(!self.db.qty_by_product_id){
                self.db.qty_by_product_id = {};
            }
            ks_products.forEach(ks_product => {
                self.db.qty_by_product_id[ks_product.id] = ks_product.qty_available;
                //Nicolai
                /* rpc.query({
                        model: 'product.product',
                        method: 'write',
                        args: [ks_product.id, {"qty_reservation" : ks_product.qty_reservation}],
                }).then(() => {
                    console.log('ks_update_qty_by_product_id',ks_product)
                    //$('span.quantity-reservation',`article[data-product-id="${ks_product.id}"]`).html('r: ' + ks_product.qty_reservation)
                    //$('span.quantity-count',`article[data-product-id="${ks_product.id}"]`).html('d: ' + ks_product.qty_available)
                }) */
                //Fin Nicolai
            });
            self.ks_update_qty_on_product();
        },

        ks_update_qty_on_product: function () {
            var self = this;
            var ks_products = self.db.product_by_id;
            var ks_product_quants = self.db.qty_by_product_id;
            for(var pro_id in self.db.qty_by_product_id){
                ks_products[pro_id].qty_available = ks_product_quants[pro_id];
            }
        },

        push_order: function(ks_order, opts){
            var ks_pushed = ks_super_pos.push_order.call(this, ks_order, opts);
            if (ks_order){
                this.ks_update_product_qty_from_order(ks_order);
            }
            return ks_pushed;
        },

        ks_update_product_qty_from_order: function(ks_order){
            var self = this;
            ks_order.orderlines.forEach(line => {
                var ks_product = line.get_product();
                if(ks_product.type == 'product'){
                    // ks_product.qty_available -= line.get_quantity();
                    // Nicolai
                    ks_product.qty_reservation -= line.get_quantity();                    
                    // Fin Nicolai
                    self.ks_update_qty_by_product_id(self, [ks_product]);
                }
            });
        },
        //Nicolai
        delete_current_order: function(){
            let order = this.get_order()
            order.get_orderlines().forEach(line => {
                var qty = line.quantity              
                var ks_product = line.get_product();
                ks_product.qty_reservation -= qty
                //ks_product.qty_available += qty
                

                rpc.query({
                    model: 'product.product',
                    method: 'write',
                    args: [ks_product.id, {"qty_reservation" : ks_product.qty_reservation}],
                }).finally(() => {
                    //$('span.quantity-reservation',`article[data-product-id="${ks_product.id}"]`).html('r: ' + ks_product.qty_reservation)
                    //$('span.quantity-count',`article[data-product-id="${ks_product.id}"]`).html('d: ' + ks_product.qty_available)
                })
            })
            ks_super_pos.delete_current_order.apply(this, arguments);
        }
        //Fin Nicolai
    });

    ks_screens.ActionpadWidget.include({

        renderElement: function(){
            var self = this;
            this._super();
            this.$('.pay').off('click');
            this.$('.pay').click(function(){
                var order = self.pos.get_order();
                if(ks_utils.ks_validate_order_items_availability(order, self.pos.config, self.gui)) {
                    var has_valid_product_lot = _.every(order.orderlines.models, function(line){
                        return line.has_valid_product_lot();
                    });
                    if(!has_valid_product_lot){
                        self.gui.show_popup('confirm',{
                            'title': _t('Empty Serial/Lot Number'),
                            'body':  _t('One or more product(s) required serial/lot number.'),
                            confirm: function(){
                                self.gui.show_screen('payment');
                            },
                        });
                    }else{
                        self.gui.show_screen('payment');
                    }
                }
            });
            this.$('.set-customer').click(function(){
                self.gui.show_screen('clientlist');
            });
        }
    });

    ks_screens.ProductListWidget.include({

        calculate_cache_key: function(product, pricelist){
            return product.id + ',' + pricelist.id  + ',' + product.qty_available;
        },

        renderElement: function() {

            this._super();
            var task;
            clearInterval(task);
            task = setTimeout(function () {
                $(".overlay").parent().addClass('pointer-none');
            }, 100);
        },
        // Nicolai

        init: function(parent, options){
            var self = this;            
            this._super(parent, options);
            for(var i = 0, len = this.product_list.length; i < len; i++){
                this.product_list[i].qty_available -= this.product_list[i].qty_reservation
            }
            this.click_product_handler = function(){
                is_click = true
                var product = self.pos.db.get_product_by_id(this.dataset.productId);
                var orderlines = self.pos.get_order().get_orderlines()

                let line = orderlines.find( line => {
                    return line.product.id == this.dataset.productId ? true : false
                })
                /* if(!line){ */
                    var el = $(`article[data-product-id="${this.dataset.productId}"]`)
                    el.addClass('disabled')                
                    self.reserve_product(product, el);
                /* }     */            
                options.click_product_action(product);
            };
            
        },
        reserve_product: function(product, el){
            product.qty_reservation++      
            rpc.query({
                model: 'product.product',
                method: 'write',
                args: [product.id, {"qty_reservation" : product.qty_reservation}],
            }).finally(() => {
                //$('span.quantity-count',`article[data-product-id="${product.id}"]`).html('d: ' + product.qty_available)
                //$('span.quantity-reservation',`article[data-product-id="${product.id}"]`).html('r: ' + product.qty_reservation)
                el.removeClass("disabled")
            })
        }
        // Fin Nicolai
    });

    //Nicolai
    ks_models.Orderline = ks_models.Orderline.extend({
        reserve_stock: function(orderline, product, first_orderline_quantity, last_orderline_quantity){
            if(orderline == undefined || orderline.product.id != product.id){
                orderline = {'quantity' : 0};
            } 

            var el = $(`article[data-product-id="${product.id}"]`)
            el.addClass('disabled') 

//            product.qty_available += (first_orderline_quantity - last_orderline_quantity);
            product.qty_reservation -= (first_orderline_quantity - last_orderline_quantity)  

            rpc.query({
                model: 'product.product',
                method: 'write',
                args: [product.id, {"qty_reservation" : product.qty_reservation}],
            }).finally(() => {
                //$('span.quantity-count',`article[data-product-id="${product.id}"]`).html('d: ' + product.qty_available)
                //$('span.quantity-reservation',`article[data-product-id="${product.id}"]`).html('r: ' + product.qty_reservation)
                el.removeClass("disabled")
            })
            return product;
        },
        set_quantity: function(quantity, keep_price){
            
            if(this.order.get_selected_orderline() && this.order.get_selected_orderline().product.id == this.product.id){
                    var first_orderline_quantity = _.clone(this.order.get_selected_orderline().get_quantity())
                    ks_super_orderline.set_quantity.apply(this, arguments)
                    var last_orderline_quantity
                    if(arguments[0] == "remove"){
                        last_orderline_quantity = 0    
                    } else {
                        last_orderline_quantity = _.clone(this.quantity)
                    }                    
                    if(!is_click){
                        this.reserve_stock(this, this.product, first_orderline_quantity, last_orderline_quantity)
                    }
            }
             else {
                ks_super_orderline.set_quantity.apply(this, arguments)
                is_click = false
            }            
        } 
    })
    ks_models.NumpadState = ks_models.NumpadState.extend({
        deleteLastChar: function(){
            is_click = false
            ks_super_numpadstate.deleteLastChar.apply(this, arguments)
        },
        resetValue: function(){
            is_click = false
            ks_super_numpadstate.resetValue.apply(this, arguments)
        },
        appendNewChar: function(event) {
            is_click = false
            ks_super_numpadstate.appendNewChar.apply(this, arguments)
        }
    })
    // Fin Nicolai
    ks_screens.PaymentScreenWidget.include({
        finalize_validation: function(){
            let order = this.pos.get_order()
            order.get_orderlines().forEach(line => {
                var qty = line.quantity              
                var ks_product = line.get_product();
                ks_product.qty_reservation -= qty
                rpc.query({
                    model: 'product.product',
                    method: 'write',
                    args: [ks_product.id, {"qty_reservation" : ks_product.qty_reservation, "action" : "paid_order"}],
                })
            })
            this._super()
        },
        validate_order: function(force_validation) {
            if(ks_utils.ks_validate_order_items_availability(this.pos.get_order(), this.pos.config, this.gui)){
                this._super(force_validation)
            }
        }
    });
});