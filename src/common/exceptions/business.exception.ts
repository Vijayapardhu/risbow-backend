import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: number = HttpStatus.BAD_REQUEST,
    public readonly details?: any,
  ) {
    super({ code, message, details }, statusCode);
  }
}

