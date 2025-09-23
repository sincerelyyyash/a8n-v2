import smtplib
from email.message import EmailMessage
import os
import imaplib
import email
import asyncio

SMTP_PORT = int(os.getenv("SMTP_PORT", 465))


async def send_email(
    sender_email: str,
    sender_password: str,
    receiver_email: str,
    subject: str,
    msg: str,
    smtp_server: str,
):
    mail = EmailMessage()
    mail["Subject"] = subject
    mail["From"] = sender_email
    mail["To"] = receiver_email
    mail.set_content(msg)

    try:
        with smtplib.SMTP_SSL(smtp_server, SMTP_PORT) as server:
            server.login(sender_email, sender_password)
            server.send_message(mail)
        print("Email sent successfully")
    except Exception as e:
        print(f"Error sending mail: {str(e)}")


async def check_for_mails(
    receiver_email: str,
    receiver_email_password: str,
    imap_server: str,
):
    try:
        imap = imaplib.IMAP4_SSL(imap_server)
        imap.login(receiver_email, receiver_email_password)

        imap.select("inbox")

        status, email_ids = imap.search(None, "UNSEEN")
        if status != "OK":
            print("No new emails found.")
            return []
        email_id_list = email_ids[0].split()
        messages = []

        for email_id in email_id_list:
            status, msg_data = imap.fetch(email_id, "(RFC822)")
            if status != "OK":
                continue

            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    messages.append(
                        {
                            "subject": msg["subject"],
                            "from": msg["from"],
                        }
                    )

        imap.logout()
        return messages

    except Exception as e:
        print(f"Error checking mails: {str(e)}")
        return []


async def send_email_and_wait_for_reply(
    sender_email: str,
    sender_password: str,
    receiver_email: str,
    subject: str,
    msg: str,
    smtp_server: str,
    imap_server: str,
    wait_timeout_seconds: int = 300,
    poll_interval_seconds: int = 10,
):
    await send_email(
        sender_email=sender_email,
        sender_password=sender_password,
        receiver_email=receiver_email,
        subject=subject,
        msg=msg,
        smtp_server=smtp_server,
    )

    start = asyncio.get_event_loop().time()
    while True:
        if asyncio.get_event_loop().time() - start > wait_timeout_seconds:
            return {"status": "timeout", "messages": []}

        messages = await check_for_mails(
            receiver_email=sender_email,
            receiver_email_password=sender_password,
            imap_server=imap_server,
        )

        if messages:
            return {"status": "received", "messages": messages}

        await asyncio.sleep(poll_interval_seconds)
