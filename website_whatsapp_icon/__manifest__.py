# -*- coding: utf-8 -*-

{
    'name': 'Website Floating WhatsApp Icon',
    'summary': """Floating Whatsapp Icon for Odoo Website.""",
    'description': """Helps people to connect easily through WhatsApp.""",
    'version': '13.0.1.0.0',
    'category': 'Tools',
    'author': "Kripal K",
    'website': "https://www.linkedin.com/in/kripal754/",
    'license': 'LGPL-3',
    'depends': ['website'],
    'data': [
        'views/whatsapp_icon_assets.xml',
        'views/whatsapp_icon_templates.xml',
        'views/inherit_res_config_settings.xml'
    ],
    'images': ['static/description/banner.png'],
    'installable': True,
    'application': False,
    'auto_install': False,
}

