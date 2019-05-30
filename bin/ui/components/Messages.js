const React = require('react')
const EventEmitter = require('eventemitter3')

const bus = new EventEmitter()
const print = message => bus.emit('message', message)

const Messages = ({ length }) => {
  let [messages, setMessages] = React.useState([])

  React.useEffect(() => {
    bus.on('message', message => {
      setMessages(messages => [...messages, message])
    })
  }, [])

  return (
    <div>
      <div>Messages:</div>
      {messages.slice(-1 * length).map((msg, i) => (
        <div key={i}>{msg}</div>
      ))}
    </div>
  )
}

exports.print = print
exports.Messages = Messages
