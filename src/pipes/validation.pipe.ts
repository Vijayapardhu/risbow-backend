import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return this.sanitizeValue(value);
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = errors.map(error => {
        return Object.values(error.constraints || {}).join(', ');
      }).join('; ');

      throw new BadRequestException(messages);
    }

    return this.sanitizeValue(object);
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private sanitizeValue(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      // Sanitize HTML and remove potentially dangerous content
      return sanitizeHtml(obj, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        allowedAttributes: {},
      });
    }

    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map(item => this.sanitizeValue(item));
      } else {
        const sanitizedObj = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitizedObj[key] = this.sanitizeValue(obj[key]);
          }
        }
        return sanitizedObj;
      }
    }

    return obj;
  }
}