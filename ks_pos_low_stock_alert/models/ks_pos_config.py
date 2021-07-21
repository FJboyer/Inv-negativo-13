#
# @Author: KSOLVES India Private Limited
# @Email: sales@ksolves.com
#


from odoo import api, fields, models

class PosConfig(models.Model):
    _inherit = 'pos.config'

    display_stock = fields.Boolean(string = 'Display Stock of products in POS', default = True)
    minimum_stock_alert = fields.Integer(string='Minimum Limit to change the stock color for the product', default = 0)
    allow_order_when_product_out_of_stock = fields.Boolean(string = 'Allow Order when Product is Out Of Stock', default = True)

# Nicolai
class PosProductStockReservation(models.Model):
    _inherit = 'product.product'
    qty_reservation = fields.Integer('Cantidad reservada')

    def write(self, vals):
        action = None
        if 'action' in vals:
            action = vals['action']
            vals.pop('action')
        result = super(PosProductStockReservation, self).write(vals)
        #print(f"action: {action}", f"self: {self}", f"vals: {vals}")
        self.send_field_updates(self.ids, self.qty_reservation, self.qty_available, action)
        return result

    @api.model
    def send_field_updates(self, products_ids, products_qty_reservation, products_qty_available, action):
        channel_name = "pos_product_sync"
        data = {'message': 'update_product_fields', 'action': action, 'products_ids': products_ids, 'products_qty_reservation': products_qty_reservation, 'products_qty_available': products_qty_available}
        self.env['pos.config'].send_to_all_poses(channel_name, data)