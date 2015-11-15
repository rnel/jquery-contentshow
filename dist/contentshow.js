

/*!
 * Contentshow
 * 
 */


;(function ( $, window, document, undefined ) {

    var pluginName = "contentshow",
      defaults = {
        debounceDelay: 100,
        startOffset: 100,
        endOffset: 100,
        useViewportUnit: false,
        sectionIndex: 0,
        contentAnimateClass: 'contentshow-animate',
        onSectionChange: null,
        onContentChange: null,
        swipe: {
          threshold: 30,
          maxDuration: 200
        }
      };

    var DIRECTION = {
        PREV: 1,
        NEXT: 2
      };


    function debounce(func, wait, immediate) {
      var timeout;
      return function() {
        var context = this, args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    }


    function getHighestOrder($contents) {
      var highest = -1;

      $contents.each(function() {
        var order = $(this).data('csOrder');

        if (order > highest) {
          highest = order;
        }
      });

      return highest;
    }

    
    function Contentshow( element, options ) {
      this.element = element;
      this.$el = $(element);
      this.metadata = this.$el.data();

      this.options = $.extend( {}, defaults, options, this.metadata);

      this._defaults = defaults;
      this._name = pluginName;

      this.init();
    }


    Contentshow.prototype = {

      init: function() {
        this.$contentshow = this.$el;
        this.$contentshowSectionsContainer = this.$contentshow.find('.contentshow-sections-container');
        this.$contentshowSections = this.$contentshow.find('.contentshow-section:visible');
        this.$nextButton = this.$contentshow.find('.contentshow-next-button');

        this.totalSections = this.$contentshowSections.length;
        this.direction = DIRECTION.NEXT;

        this.buildNavigation();
        this.setEvents();
        this.disableScrollOnTouchDevices();
        this.start();
      },


      buildNavigation: function() {
        var $contentshowNav = this.$contentshow.find('.contentshow-nav'),
          navItems = [];

        for (var i = 0; i < this.totalSections; i++) {
          navItems[i] = '<li><span class="contentshow-nav-item" data-section-index="'+i+'"></span></li>';
        }

        $contentshowNav.html('<ul>' + navItems.join('') + '</ul>');

        this.$contentshowNavItems = $contentshowNav.find('.contentshow-nav-item');

        this.$contentshowNavItems.first().addClass('active visited');
      },


      setEvents: function() {
        var self = this;

        // Set mousewheel event
        // mousewheel DOMMouseScroll
        $(window).on('wheel', debounce(function(e){
          var delta = e.originalEvent.deltaY;
          self.onscroll(delta);
        }, this.options.debounceDelay, true));

        // Set touch events
        this.$contentshow.on('touchstart', function(e){
          self.startSwipe = e.changedTouches[0].pageY;
          self.startTime = new Date().getTime();
        });

        this.$contentshow.on('touchend touchcancel', function(e){
          var endSwipe = e.changedTouches[0].pageY,
            distance = Math.abs(endSwipe - self.startSwipe),
            endTime = new Date().getTime(),
            elapseTime = endTime - self.startTime,
            delta;

          if (elapseTime <= self.options.swipe.maxDuration && distance >= self.options.swipe.threshold) {
            delta = self.startSwipe - endSwipe;
            self.onscroll(delta);
          }
        });

        // Set dot nav event
        this.$contentshowNavItems.click(function(e){
          var sectionIndex = $(this).data('sectionIndex');
          self.jumptoSection(sectionIndex);
        });

        // Set scroll down event
        this.$nextButton.click(function(e){
          self.onscroll(1);
        });

        // Using arrow keys
        $('html').keydown(function(e){
          if (e.which == 38) { // up
            self.onscroll(-1);
          }
          else if (e.which == 40) { // down
            self.onscroll(1);
          }
        });
      },


      onscroll: function(delta) {
        var direction;
          
        // console.log('delta', delta);

        if (!this.$currentSection) {
          this.$currentSection = this.$contentshowSections.eq(this.currentSectionIndex);
        }
        
        if (delta < 0) {
          direction = DIRECTION.PREV;
        }
        else {
          direction = DIRECTION.NEXT;
        }

        this.showContent(direction);
      },


      start: function() {
        if (typeof this.options.sectionIndex !== 'number' || this.options.sectionIndex <= 0) {
          this.gotoSection(0);
        } else {
          this.jumptoSection(this.options.sectionIndex);
        }
      },


      gotoSection: function(sectionIndex) {
        var translateYValue,
          transformValue;

        this.$contentshow.removeClass('current-section-' + this.currentSectionIndex);

        this.currentSectionIndex = sectionIndex;

        this.$contentshowNavItems.removeClass('active');
        this.$contentshowNavItems.eq(this.currentSectionIndex).addClass('active visited');

        translateYValue = this.currentSectionIndex * -100;

        if (Modernizr.csstransforms3d) {
          transformValue = 'translate3d(0, ' + translateYValue + 'vh, 0)';
        }
        else {
          transformValue = 'translateY(' + translateYValue + 'vh)';
        }

        this.$contentshowSectionsContainer.css('transform', transformValue);
        this.$currentSection = this.$contentshowSections.eq(this.currentSectionIndex);
        this.currentHighestContentOrder = getHighestOrder(this.$currentSection.find('.contentshow-content'));
        this.$currentContentContainer = this.$currentSection.find('.contentshow-grouped-contents');

        // Show the first content of the current section
        if (this.direction === DIRECTION.NEXT) {
          this.currentContentOrder = -1;
          this.showContent(this.direction);
        }

        this.$contentshow.addClass('current-section-' + this.currentSectionIndex);

        if (typeof this.options.onSectionChange === 'function') {
          this.options.onSectionChange.call(this, { $section: this.$currentSection, sectionIndex: this.currentSectionIndex } );
        }
      },


      showContent: function(direction) {
        var $currentContent,
          $lastContent,
          newContentOrder,
          sectionIndex;

        this.direction = direction;

        if (this.direction === DIRECTION.PREV) {
          if (this.currentContentOrder === 0 && this.currentSectionIndex === 0) {
            return;
          }

          $lastContent = this.$currentSection.find('.contentshow-content[data-cs-order="' + this.currentContentOrder + '"]');
          $lastContent.removeClass(this.options.contentAnimateClass);

          this.adjustGroupedContentsContainers();

          // new content order
          newContentOrder = this.currentContentOrder - 1;

          if (newContentOrder === -1) {
            sectionIndex = this.currentSectionIndex - 1;
            this.gotoSection(sectionIndex);
            this.currentContentOrder = this.currentHighestContentOrder;
          } else {
            this.currentContentOrder = newContentOrder;
          }

          $currentContent = this.$currentSection.find('.contentshow-content[data-cs-order="' + this.currentContentOrder + '"]');
          this.triggerContentChange($currentContent);

          this.toggleNextButton();

        } else if (this.direction === DIRECTION.NEXT) {
          // new content order
          newContentOrder = this.currentContentOrder + 1;

          if (this.currentContentOrder === -1 && this.currentHighestContentOrder === -1) {
            this.currentContentOrder = newContentOrder;
          } else {
            if (newContentOrder <= this.currentHighestContentOrder) {
              this.currentContentOrder = newContentOrder;

              $currentContent = this.$currentSection.find('.contentshow-content[data-cs-order="' + this.currentContentOrder + '"]');
              $currentContent.addClass(this.options.contentAnimateClass);
              this.triggerContentChange($currentContent);

              this.adjustGroupedContentsContainers();

              this.toggleNextButton();
            } else if (this.currentSectionIndex < (this.totalSections-1)) {
              sectionIndex = this.currentSectionIndex + 1;
              this.gotoSection(sectionIndex);
            }
          }
        }
      },


      triggerContentChange: function($currentContent) {
        if (typeof this.options.onContentChange === 'function' && $currentContent.length) {
          this.options.onContentChange.call(this, { $content: $currentContent, contentOrder: this.currentContentOrder, sectionIndex: this.currentSectionIndex } );
        }
      },


      toggleNextButton: function() {
        if (this.currentSectionIndex === (this.totalSections-1) && this.currentContentOrder === this.currentHighestContentOrder) {
          this.$nextButton.hide();
          this.$contentshow.addClass('last-content');
        } else {
          if (!this.$nextButton.is(':visible')) {
            this.$nextButton.show();
          }
          
          this.$contentshow.removeClass('last-content');
        }
      },


      adjustGroupedContentsContainers: function($groupedContentsContainers) {
        var self = this,
          $groupedContentsContainers = $groupedContentsContainers || this.$currentContentContainer;

        $groupedContentsContainers.each(function() {
          self.adjustGroupedContentsContainerPosition($(this));
        });
      },


      adjustGroupedContentsContainerPosition: function($groupedContentsContainer) {
        var viewportHeight = $(document).height(),
          maxViewableHeight = viewportHeight - this.options.startOffset - this.options.endOffset,
          newPosition,
          contentContainerHeight = 0;

        $groupedContentsContainer.find('.' + this.options.contentAnimateClass).each(function() {
          contentContainerHeight += $(this).outerHeight(true);
        });

        if (contentContainerHeight < maxViewableHeight) {
          newPosition = 50 - (contentContainerHeight / viewportHeight * 100 / 2);
        }
        else {
          newPosition = -((contentContainerHeight - (viewportHeight-this.options.endOffset)) / viewportHeight * 100);
        }

        if (this.options.useViewportUnit) {
          newPosition = newPosition + 'vh';
        }
        else {
          newPosition = (newPosition * (viewportHeight/100)) + 'px';
        }

        var transformValue;
        if (Modernizr.csstransforms3d) {
          transformValue = 'translate3d(0, ' + newPosition + ', 0)';
        }
        else {
          transformValue = 'translateY(' + newPosition + ')';
        }

        $groupedContentsContainer.css('transform', transformValue);
      },


      jumptoSection: function(sectionIndex) {
        var fromIndex = this.currentSectionIndex || 0;

        if (this.currentSectionIndex !== sectionIndex) {
          if (fromIndex < sectionIndex) {
            this.fastForward(fromIndex, sectionIndex);
          }
          else {
            this.fastRewind(fromIndex, sectionIndex);
          }
        }
      },


      fastForward: function(fromIndex, toIndex) {
        for (var i = fromIndex; i < toIndex; i++) {
          this.showAllContent(i);
        }

        this.direction = DIRECTION.NEXT;
        this.gotoSection(toIndex);
      },


      fastRewind: function(fromIndex, toIndex) {
        for (var i = fromIndex; i >= toIndex; i--) {
          this.hideAllContent(i);
        }

        this.direction = DIRECTION.NEXT;
        this.gotoSection(toIndex);
      },


      showAllContent: function(sectionIndex) {
        var $section = this.$contentshowSections.eq(sectionIndex),
          $groupedContentsContainer = $section.find('.contentshow-grouped-contents'),
          $contentshowContent = $section.find('.contentshow-content');

        $contentshowContent.addClass(this.options.contentAnimateClass);

        this.adjustGroupedContentsContainers($groupedContentsContainer);
      },


      hideAllContent: function(sectionIndex) {
        var $contentshowContent = this.$contentshowSections.eq(sectionIndex).find('.contentshow-content');

        $contentshowContent.removeClass(this.options.contentAnimateClass);
      },


      disableScrollOnTouchDevices: function() {
        if (Modernizr.touch) {
          $(window).on('touchmove', function(e){
            e.preventDefault();
          });

          setTimeout(function(){
            $(window).scrollTop(0);
          }, 1000);
        }
      }

    };


    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function ( options ) {
      return this.each(function () {
        if (!$.data(this, "plugin_" + pluginName)) {
          $.data(this, "plugin_" + pluginName,
          new Contentshow( this, options ));
        }
      });
    };

})( jQuery, window, document );