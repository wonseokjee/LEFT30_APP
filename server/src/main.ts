import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', // Replace with your frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    allowedHeaders: 'Content-Type, Accept', // Allowed headers
    exposedHeaders: 'Content-Type, Accept', // Exposed headers
    maxAge: 3600, // Cache preflight response for 1 hour
    preflightContinue: false, // Do not pass the request
    //     optionsSuccessStatus: 204, // Use 204 No Content for successful OPTIONS requests
    //     optionsSuccessStatus: 200, // Use 200 OK for successful OPTIONS requests
  });

  await app.listen(process.env.PORT ?? 3030);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
