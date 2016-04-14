import { searchForTerm, isValidSearchTerm } from 'discourse/lib/search';
import { createWidget } from 'discourse/widgets/widget';
import { h } from 'virtual-dom';


createWidget('search-result-user', {
  html() {
    return "users";
  }
});

createWidget('search-result-topic', {
  html() {
    return "topics";
  }
});

createWidget('search-result-category', {
  html() {
    return "users";
  }
});

createWidget('search-menu-results', {
  tagName: 'div.results',

  html(attrs) {
    if (attrs.noResults) {
      return h('div.no-results', I18n.t('search.no_results'));
    }

    const results = attrs.results;
    const resultTypes = results.resultTypes || [];
    return resultTypes.map(rt => {
      const more = [];

      console.log(rt.moreUrl);
      if (rt.moreUrl) {
        more.push(this.attach('link', { className: 'filter', href: rt.moreUrl, label: 'show_more' }));
      }

      return [
        h('ul', this.attach(rt.componentName, { results, term: attrs.term })),
        h('div.no-results', more)
      ];

    });
  }
});

// Helps with debouncing and cancelling promises
const SearchHelper = {
  _activeSearch: null,
  _cancelSearch: null,

  // for cancelling debounced search
  cancel() {
    this._cancelSearch = true;
    Ember.run.later(() => this._cancelSearch = false, 400);
  },

  perform(widget) {
    if (this._cancelSearch){
      this._cancelSearch = null;
      return;
    }

    if (this._activeSearch) {
      this._activeSearch.abort();
      this._activeSearch = null;
    }

    const { state } = widget;
    const { term, typeFilter, contextEnabled } = state;
    const searchContext = contextEnabled ? widget.searchContext() : null;
    const fullSearchUrl = 'test';

    this._activeSearch = searchForTerm(term, { typeFilter, searchContext, fullSearchUrl });
    this._activeSearch.then(content => {
      state.noResults = content.resultTypes.length === 0;
      state.results = content;
    }).finally(() => {
      state.loading = false;
      widget.scheduleRerender();
      this._activeSearch = null;
    });
  }
};

export default createWidget('search-menu', {
  tagName: 'div.search-menu',
  buildKey: () => 'search-menu',

  defaultState() {
    return { loading: false,
             results: {},
             noResults: false,
             term: null,
             contextEnabled: false,
             typeFilter: null };
  },

  panelContents() {
    const { state } = this;
    const { contextEnabled } = state;

    const results = [this.attach('search-term', { value: state.term, contextEnabled }),
                     this.attach('search-context', { contextEnabled })];

    if (state.loading) {
      results.push(h('div.searching', h('div.spinner')));
    } else {
      results.push(this.attach('search-menu-results', { term: state.term,
                                                        noResults: state.noResults,
                                                        results: state.results }));
    }

    return results;
  },

  searchContext() {
    if (!this._searchContext) {
      const service = this.container.lookup('search-service:main');
      this._searchContext = service.get('searchContext');
    }
    return this._searchContext;
  },

  html() {
    return this.attach('menu-panel', { maxWidth: 500, contents: () => this.panelContents() });
  },

  clickOutside() {
    this.sendWidgetAction('toggleSearchMenu');
  },

  triggerSearch() {
    const { state } = this;

    state.noResults = false;
    if (isValidSearchTerm(state.term)) {
      state.loading = true;
      Ember.run.debounce(SearchHelper, SearchHelper.perform, this, 400);
    } else {
      state.results = [];
    }
  },

  searchContextChanged(enabled) {
    this.state.contextEnabled = enabled;
    this.triggerSearch();
  },

  searchTermChanged(term) {
    this.state.term = term;
    this.triggerSearch();
  }

});
