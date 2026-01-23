import { Module } from '@nestjs/common';
import { ElasticsearchModule as NestElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        NestElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                node: configService.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200'),
                auth: {
                    username: configService.get<string>('ELASTICSEARCH_USERNAME', ''),
                    password: configService.get<string>('ELASTICSEARCH_PASSWORD', ''),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    exports: [NestElasticsearchModule],
})
export class ElasticsearchModule { }
