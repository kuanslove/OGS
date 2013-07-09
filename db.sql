DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS images;

CREATE TABLE products (
id serial primary key not null,
name varchar(50) not null,description varchar(200),
img_id integer,
user_id integer not null,
category_id integer not null,
amnt integer not null default 0,
date_reg timestamp not null default now(),
date_rev timestamp not null default now(),
n_a boolean not null default false);

CREATE TABLE users (
id serial primary key not null,
name varchar(50) not null,
email varchar(50) not null,
pswd varchar(20) not null,
admn boolean not null default false,
n_a boolean not null default false);

CREATE TABLE category (
id serial primary key not null,
name varchar(30) not null,
n_a boolean default false);

CREATE TABLE images (
id serial primary key not null,
img_data text,
user_id integer not null,
category_id integer not null,
product_id integer not null,
n_a boolean not null default false);
