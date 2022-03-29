import React from "react";

interface MessageListProps extends Props { messages?: Messages }

const MessageList = ({ messages = [] }: MessageListProps) => <div>
  {messages.map((message, index) => <div key={index} className="bubble you">
    <div className="user">
      <img src={message.user.avatar} alt="" />
    </div>
    <div className="messageContent">
      <span className="userName">{message.user.name}</span>
      <p>{message.content}</p>
    </div>
  </div>)}
</div>;

export default MessageList;
