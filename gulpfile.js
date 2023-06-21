import gulp from 'gulp'
import plumber from 'gulp-plumber';
import sass from 'gulp-dart-sass';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import csso from 'postcss-csso'
import browser from 'browser-sync';
import rename from 'gulp-rename'
import htmlmin from 'gulp-htmlmin'
import svgo from 'gulp-svgo'
import svgstore from 'gulp-svgstore'
import terser from 'gulp-terser'
import {deleteAsync} from 'del'
import imagemin from 'gulp-imagemin'
import webp from 'gulp-webp'


// Styles

export const styles = () => {
  return gulp.src('source/sass/style.scss', {sourcemaps: false})
    .pipe(plumber())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([
      autoprefixer(),
      csso(),
    ]))
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('build/css', {sourcemaps: '.'}))
    .pipe(browser.stream());
}

// HTML

const html = () => {
  return gulp.src('source/*.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('build'))
}

// Copy

const copyWithoutProcessing = (done) => {
  gulp.src([
      'source/fonts/*{woff,woff2}',
      'source/*.ico',
      'source/*.webmanifest'
    ],
    {
      base: 'source'
    })
    .pipe(gulp.dest('build'))
  done();
}

// Clean

const clean = () => {
  return deleteAsync('build')
}

//Scripts

const scripts = () => {
  return gulp.src('source/js/**/*.js')
    .pipe(terser())
    // .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('build/js'))
}

// Sprites

export const sprite = () => {
  return gulp.src('source/images/sprite/*.svg')
    .pipe(svgo())
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename('sprites.svg'))
    .pipe(gulp.dest('build/images'))
}

// Images

const optimizeImages = () => {
  return gulp.src('source/images/**/*.{jpg,png}')
    .pipe(imagemin())
    .pipe(gulp.dest('build/images'))
}

const copyImages = () => {
  return gulp.src('source/images/**/*.{jpg,png}')
    .pipe(gulp.dest('build/images'))
}

//WebP

const createWebp = () => {
  return gulp.src([
    'source/images/**/*.{jpg,png}',
  ])
    .pipe(webp())
    .pipe(gulp.dest('build/images'))
}

//SVG

export const svg = () => {
  return gulp.src(['source/images/**/*.svg', '!source/images/sprite/*.svg'])
    .pipe(svgo())
    .pipe(gulp.dest('build/images'))
}

// Server

const server = (done) => {
  browser.init({
    server: {
      baseDir: 'build'
    },
    cors: true,
    notify: false,
    ui: false,
  });
  done();
}

// Reload

const reload = () => {
  html()
  sprite()
  browser.reload()
}

// Watcher

const watcher = () => {
  gulp.watch('source/sass/**/*.scss', gulp.series(styles));
  gulp.watch('source/js/**/*.js', gulp.series(scripts))
  gulp.watch('source/*.html').on('change', reload);
}

// Default

export default gulp.series(
  clean,
  copyWithoutProcessing,
  copyImages,
  gulp.parallel(
    styles,
    html,
    scripts,
    svg,
    sprite,
    createWebp
  ),
  gulp.series(
    server,
    watcher
  )
);


//Build

export const build = gulp.series(
  clean,
  copyWithoutProcessing,
  optimizeImages,
  gulp.parallel(
    styles,
    html,
    scripts,
    svg,
    sprite,
    createWebp
  )
)
