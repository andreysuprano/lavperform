import { createTransport, Transporter } from 'nodemailer';

export class Smtp {
	transporter: Transporter;

	constructor() {
		const config = {
			host: process.env.SMTP_HOST,
			port: process.env.SMTP_PORT,
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASSWORD,
			},
			tls: {
				rejectUnauthorized: false
			},
            secure: true,
		};
        console.log(config);
		this.transporter = createTransport(config);
	}

	async sendMail(to: string, subject: string, conteudo: string) {
		this.transporter.sendMail(
			{
				from: `"${process.env.WHITELABEL === 'lavperform' ? 'LavPerform' : 'FoodCRM'}" ` + process.env.SMTP_USER,
				to,
				subject,
				html: conteudo
			},
			(error, info) => {
				console.log(error, info);
			}
		);
	}
}