import {
    BrandingData,
    HeroData,
    ServicesData,
    LocationData,
    FaqData,
    TestimonialsData,
    CtaData,
    FooterData,
    NavigationItem,
} from '../domain/landing-page.entity';

export function generateDefaultLandingPageData(
    companyName: string,
    companySlug: string,
    companyAddress?: string,
    companyPhone?: string
) {
    const whatsappNumber = companyPhone?.replace(/\D/g, '') || '5548999999999';
    const address = companyAddress || 'Endereço não cadastrado';

    return {
        slug: companySlug,
        customDomain: null,
        active: true,
        template: 'default',
        branding: {
            name: companyName,
            slogan: 'Lavanderia Express',
            logo: '/laundry.png',
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            tertiaryColor: '#F59E0B',
        } as BrandingData,

        hero: {
            title: 'Lave e Seque com Praticidade',
            highlightWord: 'Praticidade',
            subtitle: address,
            location: address,
            backgroundImage: '/hero.jpg',
            hours: {
                label: 'das 07:00 às 22:30',
                time: '07:00 - 22:30',
                days: 'Todos os dias',
            },
            payment: {
                label: 'Pagamento Digital',
                methods: 'Cartão e PIX',
            },
            ctaText: 'Solicitar Atendimento',
            ctaLink: `https://wa.me/${whatsappNumber}`,
        } as HeroData,

        services: {
            title: 'Serviços',
            description: 'Preços acessíveis e qualidade garantida para o cuidado das suas roupas.',
            items: [
                {
                    title: 'Lavagem',
                    description: 'Lavagem completa para suas roupas, garantindo limpeza e cuidado.',
                    price: 'R$ 17,90',
                    vantageList: [
                        'Qualidade única da lavagem',
                        'Produtos de alta tecnologia e exclusivos da marca',
                        'Máquinas modernas e rápidas',
                    ],
                },
                {
                    title: 'Secagem',
                    description: 'Secagem eficiente para deixar suas roupas prontas para usar.',
                    price: 'R$ 17,90',
                    vantageList: [
                        'Secagem controlada',
                        'Preservação e maciez das roupas',
                        'Roupas secas e sem pêlos',
                    ],
                },
                {
                    title: 'Serviço de atendente',
                    description: 'Ajuda rápida para você lavar certo e economizar tempo.',
                    price: 'a partir de R$ 45,00',
                    vantageList: [
                        'Praticidade e economia',
                        'Cuidado total com suas roupas',
                        'Atendimento rápido e eficiente',
                    ],
                },
            ],
        } as ServicesData,

        location: {
            title: 'Localização',
            description: 'Localidade estratégica funcionando das 07:00 às 22:30.',
            items: [
                {
                    placeName: companyName,
                    address: address,
                    mapUrl: 'https://goo.gl/maps/example',
                    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.9539734866793!2d-46.66255102498167!3d-23.563987984686736',
                    googleMapsLink: 'https://goo.gl/maps/example',
                }
            ],
        } as LocationData,

        faq: {
            title: 'Perguntas Frequentes',
            description: 'Tire suas dúvidas sobre os nossos serviços.',
            items: [
                {
                    value: '1',
                    title: 'O que posso lavar e secar?',
                    text: `
<b>✅ Pode lavar e secar:</b>
<ul>
  <li>👕 Roupas de algodão</li>
  <li>👖 Jeans e tecidos resistentes</li>
  <li>🧦 Meias e roupas íntimas</li>
  <li>🏠 Roupas de cama e banho</li>
  <li>👶 Roupas infantis</li>
  <li>🛏️ Cobertor e Edredon de solteiro</li>
  <li>🛌 Cobertor e Edredon de Casal somente no tamanho "Padrão"</li>
</ul>
<br/>
<b>❌ Não pode lavar e secar:</b>
<ul>
    <li>🦺 Roupas com couro ou materiais especiais</li>
    <li>👗 Peças delicadas (seda, renda)</li>
    <li>🧥 Casacos com enchimento especial</li>
    <li>👞 Sapatos, tênis e similares</li>
    <li>🐕 Roupas com pêlos de PET</li>
    <li>🛏️ Edredon, Cobertor ou Coberdron modelos Queen e King Size</li>
    <li>🏠 Tapetes de todos os tipos</li>
    <li>🧽 Panos de chão</li>
    <li>🖤 Cortinas BlackOut</li>
    <li>🧸 Travesseiros e Bichos de Pelúcia de todos os tipos</li>
    <li>🎒 Mochilas e bolsas</li>
</ul>
                    `,
                },
                {
                    value: '2',
                    title: 'Como funciona o processo de lavagem e secagem?',
                    text: `
<b>📋 Passo a passo:</b>
<ol>
    <li>🧺 Separe as roupas por cor e tipo de tecido utilizando o cesto de roupas sujas.</li>
    <li>🔧 Selecione a lavadora escolhida e faça o pagamento da lavagem (R$ 17,90).</li>
    <li>🌀 Coloque as roupas na lavadora e inicie a lavagem</li>
    <li>🧺 Após o término, utilize o cesto de roupas limpas para retirar as roupas</li>
    <li>🔧 Para secar, selecione a secadora escolhida e faça o pagamento da secagem (R$ 17,90)</li>
    <li>🧽 Limpe o filtro da secadora antes de usar</li>
    <li>🌡️ Coloque as roupas limpas na secadora, selecione a temperatura alta e inicie a secagem</li>
</ol>
                    `,
                },
                {
                    value: '3',
                    title: 'Qual o horário de funcionamento?',
                    text: '🕕 Funcionamos todos os dias da semana, das 07:00 às 22:30. Horário perfeito para quem tem rotina corrida e precisa de praticidade! Nossa equipe está sempre disponível para te ajudar. ⏰',
                },
                {
                    value: '4',
                    title: 'Quais formas de pagamento são aceitas?',
                    text: '💳 O pagamento é feito separadamente: primeiro você paga a lavagem (R$ 17,90), realiza o processo, e depois, se quiser secar, faz um novo pagamento para a secagem (R$ 17,90). Aceitamos dinheiro, cartão e PIX, e para sua maior comodidade, temos o serviço de atendente! 💰',
                },
            ],
        } as FaqData,

        testimonials: {
            title: 'Avaliações',
            description: 'Veja o que nossos clientes dizem sobre nós.',
            items: [
                {
                    quote: 'Ótimo ambiente, excelente localização, máquinas novas!',
                    author: 'Cliente Satisfeito',
                },
                {
                    quote: 'As roupas ficam com um bom cheiro e lavagem rápida em cerca de meia hora.',
                    author: 'Cliente Feliz',
                },
                {
                    quote: 'Boas máquinas. Ambiente limpo. Utilizo bastante os serviços.',
                    author: 'Cliente Fiel',
                },
            ],
        } as TestimonialsData,

        cta: {
            title: 'Pronto para Experimentar?',
            description: `Venha conhecer ${companyName} e comprove a qualidade dos nossos serviços.`,
            buttonText: 'Solicitar Atendimento',
            whatsappNumber: whatsappNumber,
        } as CtaData,

        footer: {
            description: 'Praticidade e carinho para suas roupas.',
            locationTitle: companyName,
            address: address,
            copyright: `© ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados.`,
        } as FooterData,

        navigation: [
            { label: 'Serviços', href: '#servicos' },
            { label: 'Localização', href: '#localizacao' },
            { label: 'FAQ', href: '#faq' },
            { label: 'Avaliações', href: '#avaliacoes' },
        ] as NavigationItem[],
    };
}
