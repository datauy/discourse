import { isValidSearchTerm } from 'discourse/lib/search';
import DiscourseURL from 'discourse/lib/url';
import { default as computed, observes } from 'ember-addons/ember-computed-decorators';

export default Ember.Component.extend({
  searchService: Ember.inject.service('search'),
  typeFilter: null,

  @computed('searchService.searchContext', 'searchService.term', 'searchService.searchContextEnabled')
  fullSearchUrlRelative(searchContext, term, searchContextEnabled) {
    if (searchContextEnabled && Ember.get(searchContext, 'type') === 'topic') {
      return null;
    }

    let url = '/search?q=' + encodeURIComponent(this.get('searchService.term'));
    if (searchContextEnabled) {
      if (searchContext.id.toString().toLowerCase() === this.get('currentUser.username_lower') &&
          searchContext.type === "private_messages"
          ) {
        url += ' in:private';
      } else {
        url += encodeURIComponent(" " + searchContext.type + ":" + searchContext.id);
      }
    }

    return url;
  },

  @computed('fullSearchUrlRelative')
  fullSearchUrl(fullSearchUrlRelative) {
    if (fullSearchUrlRelative) {
      return Discourse.getURL(fullSearchUrlRelative);
    }
  },

  // If we need to perform another search
  @observes('searchService.term', 'typeFilter')
  newSearchNeeded() {
    this.set('noResults', false);
    const term = this.get('searchService.term');
    if (isValidSearchTerm(term)) {
      this.set('loading', true);
      Ember.run.debounce(this, 'searchTerm', term, this.get('typeFilter'), 400);
    } else {
      this.setProperties({ content: null });
    }
  },

  @computed('typeFilter', 'loading')
  showCancelFilter(typeFilter, loading) {
    if (loading) { return false; }
    return !Ember.isEmpty(typeFilter);
  },

  @observes('searchService.term')
  termChanged() {
    this.cancelTypeFilter();
  },

  actions: {
    fullSearch() {
      if (this._search) {
        this._search.abort();
      }

      SearchHelper.cancel();

      const url = this.get('fullSearchUrlRelative');
      if (url) {
        DiscourseURL.routeTo(url);
      }
    },

    moreOfType(type) {
      this.set('typeFilter', type);
    },

    cancelType() {
      this.cancelTypeFilter();
    },

    showedSearch() {
      $('#search-term').focus().select();
    },

    cancelHighlight() {
      this.set('searchService.highlightTerm', null);
    }
  },

  cancelTypeFilter() {
    this.set('typeFilter', null);
  },

  keyDown(e) {
    if (e.which === 13 && isValidSearchTerm(this.get('searchService.term'))) {
      this.set('visible', false);
      this.send('fullSearch');
    }
  }
});
