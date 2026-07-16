import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

// Branding DTOs
export class BrandingDto {
    @ApiProperty({ example: 'InLaundry' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'Lavanderia Express' })
    @IsString()
    slogan: string;

    @ApiProperty({ example: '/laundry.png' })
    @IsString()
    logo: string;

    @ApiProperty({ example: '#000000' })
    @IsString()
    primaryColor: string;

    @ApiProperty({ example: '#000000' })
    @IsString()
    secondaryColor: string;

    @ApiProperty({ example: '#000000' })
    @IsString()
    tertiaryColor: string;
}

// Hero DTOs
export class HeroHoursDto {
    @ApiProperty({ example: 'das 07:00 às 22:30' })
    @IsString()
    label: string;

    @ApiProperty({ example: '07:00 - 22:30' })
    @IsString()
    time: string;

    @ApiProperty({ example: 'Todos os dias' })
    @IsString()
    days: string;
}

export class HeroPaymentDto {
    @ApiProperty({ example: 'Pagamento Digital' })
    @IsString()
    label: string;

    @ApiProperty({ example: 'Cartão e PIX' })
    @IsString()
    methods: string;
}

export class HeroDto {
    @ApiProperty({ example: 'Lave e Seque com Praticidade' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Praticidade' })
    @IsString()
    highlightWord: string;

    @ApiProperty({ example: 'Centro, Florianópolis - SC' })
    @IsString()
    subtitle: string;

    @ApiProperty({ example: 'Centro, Florianópolis - SC' })
    @IsString()
    location: string;

    @ApiProperty({ example: '/hero.jpg' })
    @IsString()
    backgroundImage: string;

    @ApiProperty({ type: HeroHoursDto })
    @ValidateNested()
    @Type(() => HeroHoursDto)
    hours: HeroHoursDto;

    @ApiProperty({ type: HeroPaymentDto })
    @ValidateNested()
    @Type(() => HeroPaymentDto)
    payment: HeroPaymentDto;

    @ApiProperty({ example: 'Solicitar Atendimento' })
    @IsString()
    ctaText: string;

    @ApiProperty({ example: 'https://wa.me/5548999999999' })
    @IsString()
    ctaLink: string;
}

// Services DTOs
export class ServiceItemDto {
    @ApiProperty({ example: 'Lavagem' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Lavagem completa para suas roupas' })
    @IsString()
    description: string;

    @ApiProperty({ example: 'R$ 17,90' })
    @IsString()
    price: string;

    @ApiProperty({ example: ['Qualidade única', 'Produtos exclusivos'] })
    @IsArray()
    @IsString({ each: true })
    vantageList: string[];
}

export class ServicesDto {
    @ApiProperty({ example: 'Serviços' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Preços acessíveis e qualidade garantida' })
    @IsString()
    description: string;

    @ApiProperty({ type: [ServiceItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ServiceItemDto)
    items: ServiceItemDto[];
}

// Location DTOs
export class LocationItemDto {
    @ApiProperty({ example: 'Praça do Banco Redondo' })
    @IsString()
    placeName: string;

    @ApiProperty({ example: 'R. Vítor Konder, 390 - Sala 3 - Centro' })
    @IsString()
    address: string;

    @ApiProperty({ example: 'https://goo.gl/maps/example' })
    @IsString()
    mapUrl: string;

    @ApiProperty({ example: 'https://www.google.com/maps/embed?...' })
    @IsString()
    mapEmbedUrl: string;

    @ApiProperty({ example: 'https://goo.gl/maps/example' })
    @IsString()
    googleMapsLink: string;
}

export class LocationDto {
    @ApiProperty({ example: 'Localização' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Localidade estratégica funcionando das 07:00 às 22:30' })
    @IsString()
    description: string;

    @ApiProperty({ type: [LocationItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LocationItemDto)
    items: LocationItemDto[];
}

// FAQ DTOs
export class FaqItemDto {
    @ApiProperty({ example: '1' })
    @IsString()
    value: string;

    @ApiProperty({ example: 'Como funciona?' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Texto completo da resposta' })
    @IsString()
    text: string;
}

export class FaqDto {
    @ApiProperty({ example: 'Perguntas Frequentes' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Tire suas dúvidas sobre os nossos serviços' })
    @IsString()
    description: string;

    @ApiProperty({ type: [FaqItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FaqItemDto)
    items: FaqItemDto[];
}

// Testimonials DTOs
export class TestimonialItemDto {
    @ApiProperty({ example: 'Ótimo serviço!' })
    @IsString()
    quote: string;

    @ApiProperty({ example: 'João Silva' })
    @IsString()
    author: string;
}

export class TestimonialsDto {
    @ApiProperty({ example: 'Avaliações' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Veja o que nossos clientes dizem' })
    @IsString()
    description: string;

    @ApiProperty({ type: [TestimonialItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TestimonialItemDto)
    items: TestimonialItemDto[];
}

// CTA DTOs
export class CtaDto {
    @ApiProperty({ example: 'Pronto para Experimentar?' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Venha conhecer nossos serviços' })
    @IsString()
    description: string;

    @ApiProperty({ example: 'Solicitar Atendimento' })
    @IsString()
    buttonText: string;

    @ApiProperty({ example: '5548999999999' })
    @IsString()
    whatsappNumber: string;
}

// Footer DTOs
export class FooterDto {
    @ApiProperty({ example: 'Praticidade e carinho para suas roupas' })
    @IsString()
    description: string;

    @ApiProperty({ example: 'Praça do Banco Redondo' })
    @IsString()
    locationTitle: string;

    @ApiProperty({ example: 'R. Vítor Konder, 390 - Sala 3' })
    @IsString()
    address: string;

    @ApiProperty({ example: '© 2026 InLaundry. Todos os direitos reservados.' })
    @IsString()
    copyright: string;
}

// Navigation DTOs
export class NavigationItemDto {
    @ApiProperty({ example: 'Serviços' })
    @IsString()
    label: string;

    @ApiProperty({ example: '#servicos' })
    @IsString()
    href: string;
}

// Main DTOs
export class UpdateLandingPageDto {
    @ApiProperty({ example: 'default', description: 'Template da landing page', required: false })
    @IsOptional()
    @IsString()
    template?: string;

    @ApiProperty({ type: BrandingDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => BrandingDto)
    branding?: BrandingDto;

    @ApiProperty({ type: HeroDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => HeroDto)
    hero?: HeroDto;

    @ApiProperty({ type: ServicesDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ServicesDto)
    services?: ServicesDto;

    @ApiProperty({ type: LocationDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => LocationDto)
    location?: LocationDto;

    @ApiProperty({ type: FaqDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => FaqDto)
    faq?: FaqDto;

    @ApiProperty({ type: TestimonialsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => TestimonialsDto)
    testimonials?: TestimonialsDto;

    @ApiProperty({ type: CtaDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CtaDto)
    cta?: CtaDto;

    @ApiProperty({ type: FooterDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => FooterDto)
    footer?: FooterDto;

    @ApiProperty({ type: [NavigationItemDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => NavigationItemDto)
    navigation?: NavigationItemDto[];

    @ApiProperty({ 
        example: 'minhalavanderia.com',
        description: 'Domínio personalizado para a landing page',
        required: false
    })
    @IsOptional()
    @IsString()
    customDomain?: string;

    @ApiProperty({ example: true })
    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
