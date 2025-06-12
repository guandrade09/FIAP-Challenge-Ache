import paho.mqtt.client as mqtt
import ssl

BROKER = ""
PORT = 8883
USERNAME = ""
PASSWORD = ""
TOPIC = "" 
CA_CERT_PATH = "./Configurations/Certificate/emqxsl-ca.crt"

def ConnectMqtt():
    client = mqtt.Client()
    client.username_pw_set(USERNAME, PASSWORD)
    client.tls_set(
        ca_certs=CA_CERT_PATH,
        cert_reqs=ssl.CERT_REQUIRED,
        tls_version=ssl.PROTOCOL_TLS
    )
    return client

def PublishMessage(message):
    client = ConnectMqtt()
    client.connect(BROKER, PORT)
    client.publish(TOPIC, message)
    client.disconnect()