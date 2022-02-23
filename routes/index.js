var express = require('express');
var router = express.Router();

/* GET home page. */

const Joi = require('joi');
var CryptoJS = require("crypto-js");
var { URL } = require('url');

var paymentGatewaySchema = Joi.object({
  version: Joi.number()
    .required(),
  command: Joi.string()
    .required(),
  paymentURL: Joi.string()
    .required()
});

var merchantSchema = Joi.object({
  accessCode: Joi.number()
    .required(),
  merchantId: Joi.string()
    .required(),
  secureSecret: Joi.string()
    .required(),
});

var customerSchema = Joi.object({
  customerPhone: Joi.string()
    .required(),
  customerEmail: Joi.string()
    .required(),
  customerId: Joi.string()
    .required(),
});

class PaymentGateway {
  constructor(paymentGateway) {
    Object.assign(this, paymentGateway);
    this.validate(paymentGateway);
  }

  validate(paymentGateway) {
    var { error } = paymentGatewaySchema.validate(paymentGateway);
    if (error) {
      throw new Error('create payment gateway error')
    }
  }
}

class Merchant {
  constructor(merchant) {
    Object.assign(this, merchant);
    this.validate(merchant);
  }

  validate(merchant) {
    var { error } = merchantSchema.validate(merchant);
    if (error) {
      throw new Error('error when create merchant')
    }
  }
}

class Customer {
  constructor(customer) {
    Object.assign(this, customer);
    this.validate(customer);
  }
  validate(customer) {
    var { error } = customerSchema.validate(customer);
    if (error) {
      throw new Error('error when create customer');
    }
  }
}
var transactionSchema = Joi.object({
  paymentGateway: paymentGatewaySchema
    .required(),
  merchant: merchantSchema
    .required(),
  customer: customerSchema
    .required(),
  orderInfo: Joi.string()
    .required(),
  amount: Joi.string()
    .required(),
  title: Joi.string()
    .required(),
  transactionCode: Joi.string()
    .required(),
  currency: Joi.string()
    .required(),
  locale: Joi.string()
    .required(),
  ticketNo: Joi.string()
    .required(),
  againLink: Joi.string()
    .required(),
  returnURL: Joi.string()
    .required(),
});

class Transaction {
  constructor(transaction) {
    Object.assign(this, transaction);
    this.validate();
  }
  validate(transaction) {
    var { error } = transactionSchema.validate(transaction);
    if (error) {
      throw new Error('error in create transaction');
    }
  }
}

var createPaymentRequest = (transaction) => {

  const paymentRequestURL = new URL(transaction.paymentGateway.paymentURL);

  const paymentRequestQuery = {
    vpc_Version: transaction.paymentGateway.version,
    vpc_Command: transaction.paymentGateway.command,
    vpc_Currency: transaction.currency,
    vpc_AccessCode: transaction.merchant.accessCode,
    vpc_Merchant: transaction.merchant.merchantId,
    vpc_Locale: transaction.locale,
    vpc_ReturnURL: transaction.returnURL,
    vpc_MerchTxnRef: transaction.transactionCode,
    vpc_OrderInfo: transaction.orderInfo,
    vpc_Amount: transaction.amount,
    vpc_TicketNo: transaction.ticketNo,
    AgainLink: transaction.againLink,
    Title: transaction.title,
    // vpc_Customer_Phone: transaction.customer.customerPhone,
    // vpc_Customer_Email: transaction.customer.customerEmail,
    // vpc_Customer_Id: transaction.customer.customerId,
  }

  var secureCode = []
  Object.keys(paymentRequestQuery)
    .sort()
    .forEach(key => {
      paymentRequestURL.searchParams.append(key, paymentRequestQuery[key]);
      if (key.substr(0, 4) === 'vpc_') {
        secureCode.push(`${key}=${paymentRequestQuery[key]}`);
      }
    });
  var vpc_SecureHash = CryptoJS.HmacSHA256(secureCode.join('&'), transaction.merchant.secureSecret).toString(CryptoJS.enc.Hex).toUpperCase();
  paymentRequestURL.searchParams.append('vpc_SecureHash', vpc_SecureHash);
  return paymentRequestURL;
}

const now = new Date();
var paymentRequest = createPaymentRequest(new Transaction({
  paymentGateway: {
    version: 2,
    command: "pay",
    paymentURL: "https://mtf.onepay.vn/onecomm-pay/vpc.op",
  },
  merchant: {
    accessCode: "D67342C2",
    merchantId: "ONEPAY",
    secureSecret: "A3EFDFABA8653DF2342E8DAC29B51AF0",
  },
  customer: {
    customerPhone: "09870",
    customerId: '123',
    customerEmail: "vnu",
  },
  orderInfo: `node-${now.toISOString()}`,
  amount: "20000",
  title: "payme",
  transactionCode: `node-${now.toISOString()}`,
  currency: "VND",
  locale: "vn",
  ticketNo: '::1',
  againLink: "http://127.0.0.1:5500/public/index.html",
  returnURL: "http://localhost:8080/payment/onepaydom/callback"
}));

router.get('/home', function (req, res, next) {
  res.send(paymentRequest.href);
});

module.exports = router;
console.log(paymentRequest);

