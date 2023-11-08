import { DataSource, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

import { validate as isUUID } from 'uuid';
import { ProductImage } from './entities';
import { query } from 'express';


@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');


  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource
  ) { }

  //Crear o guadar producto en bd
  async create(createProductDto: CreateProductDto) {

    try {
      const { images = [], ...productDetails } = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map( image => this.productImageRepository.create({ url: image }))
      });
      await this.productRepository.save(product);

      return { ...product, images}

    } catch (error) {
      this.handleDBExceptios(error);


    }

  }

  //Listar todos los productos 
  async findAll( paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      }
    });

    return products.map( product => ({
      ...product,
      images: product.images.map( img => img.url)
    }))
  }

  //Mostrar un producto por id

   async findOne(term: string) {

    let product: Product
    if ( isUUID(term)) {
      product = await this.productRepository.findOneBy({id: term})
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder
                    .where('UPPER(title) =:title or slug =:slug', {
                      title: term.toUpperCase(),
                      slug: term.toLowerCase(),
                    })
                    .leftJoinAndSelect('prod.images','prodImages')
                    .getOne();
    }
   
    if(!product )
      throw new NotFoundException(`Producto cpon id ${ term } No encontrado`);

    return product;
  }

  async findOnePlain( term: string){
    const { images = [], ...rest} = await this.findOne( term )

    return {
      ...rest,
      images: images.map( img => img.url)
    }

  }

  //Actualizra un producto
  async update(id: string, updateProductDto: UpdateProductDto) {

    const { images, ...toUpdate} = updateProductDto;

    const product = await this.productRepository.preload({ id, ...toUpdate });

    console.log(product)

    if(!product) throw new NotFoundException(`Producto con id: ${ id } No encontrado`)

    //Create query Runner 

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();


    try {

      if (images) {
        await queryRunner.manager.delete( ProductImage, { product: { id }});

        product.images = images.map( 
          image => this.productImageRepository.create({ url: image })
          
        )
      }

      await queryRunner.manager.save( product );
      //await this.productRepository.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      
      return this.findOnePlain( id );
      
    } catch (error) {

      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handleDBExceptios(error)
    }


  }


  //Para eliminar un producto
  async remove(id: string) {
    const producto = await this.findOne( id );

    await this.productRepository.remove(producto)
  }

  

  private handleDBExceptios(error: any) {

    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);
    throw new InternalServerErrorException('unexpected error, check server logs');

  }

  async deleteAllProducts(){
    const query = this.productRepository.createQueryBuilder('product');

    try {
      
      return await query
            .delete()
            .where({})
            .execute();
    } catch (error) {
      this.handleDBExceptios(error);
    }
  }

}
