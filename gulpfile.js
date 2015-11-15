'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var browserSync = require('browser-sync');

gulp.task('source-js', function() {
  gulp.src('src/js/*.js')
    // non minified version
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream())
    // minified version
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js'}))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream());
});

gulp.task('source-sass', function() {
  gulp.src('src/sass/*.scss')
    .pipe(sass().on('error', sass.logError))
    // non minified version
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream())
    // minified version
    .pipe(minifyCss())
    .pipe(rename({ extname: '.min.css'}))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream());
});

gulp.task('demo-sass', function() {
  gulp.src('src/demo/sass/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('dist/demo/css'))
    .pipe(browserSync.stream());
});

gulp.task('images', function() {
  gulp.src('src/**/*.{jpg,png,gif}')
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream());
});

gulp.task('html', function() {
  gulp.src('src/**/*.html')
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream());
});

gulp.task('serve', ['source-js', 'source-sass', 'demo-sass', 'html', 'images'], function() {
  browserSync({
    server: {
      baseDir: 'dist'
    }
  });

  gulp.watch('src/js/*.js', ['source-js']);
  gulp.watch('src/sass/*.scss', ['source-sass']);
  gulp.watch('src/demo/sass/*.scss', ['demo-sass']);
  gulp.watch('src/**/*.html', ['html']);
});