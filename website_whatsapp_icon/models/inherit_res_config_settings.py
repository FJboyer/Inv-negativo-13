# -*- coding: utf-8 -*-
from odoo import fields, models


class InheritResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    show_whatsapp_icon = fields.Boolean(string="Show Whatsapp Icon", related='website_id.whatsapp_icon_show',
                                        readonly=False, default=False)
    whatsapp_no = fields.Char(string="WhatsApp Number", related='website_id.whatsapp_number', readonly=False)


class InheritWebsiteModule(models.Model):
    _inherit = "website"

    whatsapp_number = fields.Char(string='Whatsapp Number')
    whatsapp_icon_show = fields.Boolean(string='Show WhatsApp Icon')

    def is_show_whatsapp(self):
        """ Returns WhatsApp icon show enabled or not. """
        return self.whatsapp_icon_show

    def redirect_whatsapp_url(self):
        """ Returns WhatsApp Redirect URL. """
        wa_url = "https://api.whatsapp.com/send?phone=" + str(self.whatsapp_number)
        return wa_url
