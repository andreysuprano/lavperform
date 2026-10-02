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
		this.transporter = createTransport(config);
	}

	sendMail(to: string, subject: string, conteudo: string) {
		return this.transporter.sendMail({
			from: `"${process.env.WHITELABEL === 'lavperform' ? 'LavPerform' : 'FoodCRM'}" ` + process.env.SMTP_USER,
			to,
			subject,
			html: conteudo
		});
	}
}