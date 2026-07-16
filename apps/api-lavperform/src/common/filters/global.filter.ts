import { BadRequestException, Catch, ExceptionFilter, ForbiddenException, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch (exception, host): void {
    console.log("Send to Sentry");
    if (exception instanceof UnauthorizedException) {
      throw new UnauthorizedException();
    }
    if (exception instanceof BadRequestException) {
      throw new BadRequestException(exception.message);
    }
    if (exception instanceof NotFoundException) {
      throw new NotFoundException(exception.message);
    }
    if (exception instanceof ForbiddenException) {
      throw new ForbiddenException(exception.message);
    }
    if (exception instanceof InternalServerErrorException) {  
      throw new InternalServerErrorException(exception.message);
    }
  }
}