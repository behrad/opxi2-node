#!/bin/bash
LOGDIR=/var/log/opxi2
if [ ! -d "${LOGDIR}" ]; then
    mkdir ${LOGDIR}
fi
forever start -a -w -l ${LOGDIR}/tine20.log tine20.js 2>&1 >/dev/null
forever start -a -w -l ${LOGDIR}/outbound-call.log broker/node-voice/outbound-call.js 2>&1 >/dev/null
forever start -a -w -l ${LOGDIR}/kavenegar.log broker/node-sms/kavenegar.js 2>&1 >/dev/null
forever start -a -w -l ${LOGDIR}/mailgun.log broker/node-smtp/mailgun.js 2>&1 >/dev/null
forever list