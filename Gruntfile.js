module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      default: {
        src: ['node_modules/TinyAnimate/bin/TinyAnimate.js', 'src/*.js'],
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    cssmin: {
      default: {
        src: 'styles/*.css',
        dest: 'build/<%= pkg.name %>.min.css'
      }
    },
    imageEmbed: {
      default: {
        src: 'build/<%= pkg.name %>.min.css',
        dest: 'build/<%= pkg.name %>.min.css'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-image-embed');

  grunt.registerTask('default', ['uglify', 'cssmin', 'imageEmbed']);
};
