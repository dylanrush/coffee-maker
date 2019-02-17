#!/usr/bin/python

# arn arn:aws:sqs:us-east-1:088831977567:smarthome-updates.fifo
# url https://sqs.us-east-1.amazonaws.com/088831977567/smarthome-updates.fifo
# message looks like: {"device":"CoffeeMaker","newState":"ON","token":"Atz" }
import boto.sqs
import json
from datetime import datetime, timedelta
from time import sleep
from gpiozero import LED, Button

conn = boto.sqs.connect_to_region("us-east-1")
q = conn.get_queue('smarthome-updates.fifo')


#
#
#from signal import pause

led = LED(2)
#
#while True:
#    led.on()
#    sleep(1)
#    led.off()
#    sleep(1)
#led = LED(17)
#button = Button(3)
#
#button.when_pressed = led.on
#button.when_released = led.off
while 1:
	print 'Polling'
	rs = q.get_messages(attributes=['All'])
	print 'Polled'
	for message in rs:
		data = json.loads(message.get_body())
		#time_sent = datetime.utcfromtimestamp(int(message.attributes['SentTimestamp']))
		#now = datetime.now()
		#if now - timedelta(minutes=1)
		#print sent_timestamp

		print json.dumps(data)
		if data['newState'] == 'ON':
			print 'Turn the thing on'
			led.on()
		else:
			print 'Turn the thing off'
			led.off()
		q.delete_message(message)
	print 'Sleeping'
	sleep(1)
	print 'Slept'

