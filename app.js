(function (global) {
  'use strict';

  var state = {
    allAdvertisers: [],
    filteredAdvertisers: [],
    page: 1,
    selectedAdvertiserId: null,
    cycleId: null,
    indexes: {
      byRisk: {},
      byAction: {},
      byLabel: {}
    },
    filterState: {
      riskLevels: [],
      actionCodes: [],
      labelCodes: [],
      searchText: '',
      taggedStatus: APP_CONFIG.TAGGED_STATUS.ALL
    },
    sortState: {
      field: 'score_total',
      direction: 'desc'
    },
    isListCollapsed: false,
    noteSaveTimer: null,
    searchDebounceTimer: null,
    toastTimer: null
  };

  var dom = {};

  var DataLoader = {
    parseCSV: function (file) {
      return new Promise(function (resolve, reject) {
        Papa.parse(file, {
          worker: true,
          header: true,
          skipEmptyLines: true,
          transformHeader: function (header) {
            return normalizeHeader(header);
          },
          complete: function (results) {
            try {
              if (!results || !results.data || !results.data.length) {
                throw new Error('El archivo no contiene datos suficientes.');
              }

              var parsed = DataLoader.normalizeRecords(results.data, file && file.name ? file.name : '');
              resolve(parsed);
            } catch (err) {
              reject(err);
            }
          },
          error: function (err) {
            reject(err || new Error('Error parsing CSV'));
          }
        });
      });
    },

    inferCycleId: function (fileName) {
      var match = String(fileName || '').match(/(20\d{2})-(0[1-9]|1[0-2])/);
      return match ? match[0] : null;
    },

    buildIndexes: function (advertisers) {
      var indexes = {
        byRisk: {},
        byAction: {},
        byLabel: {}
      };

      advertisers.forEach(function (adv) {
        addToIndex(indexes.byRisk, adv.assigned_risk_level_code || 'INDETERMINADO', adv);
        addToIndex(indexes.byAction, adv.assigned_action_code || 'S/D', adv);
        addToIndex(indexes.byLabel, adv.assigned_label_code || 'S/D', adv);
      });

      return indexes;
    },

    normalizeRecords: function (rows, fileName) {
      var headerKeys = Object.keys(normalizeRowKeys(rows[0] || {}));
      var hasIdColumn = hasAnyAliasHeader(headerKeys, 'advertiser_id');
      var hasLabelColumn = hasAnyAliasHeader(headerKeys, 'assigned_label_code');

      if (!hasIdColumn) {
        throw new Error('No se encontro columna de ID. Se esperaba advertiser_id o similar.');
      }

      if (!hasLabelColumn) {
        throw new Error('No se encontro columna de clasificacion. Se esperaba assigned_label_code o similar.');
      }

      var normalizedRows = [];
      var idToLastIndex = {};
      var duplicateCount = 0;

      rows.forEach(function (rawRow) {
        var row = normalizeRowKeys(rawRow);
        var advertiserId = asString(findByAliases(row, 'advertiser_id')).trim();
        var labelCode = asString(findByAliases(row, 'assigned_label_code')).toUpperCase().trim();

        if (!advertiserId || !labelCode) {
          return;
        }

        var normalized = {
          advertiser_id: advertiserId,
          advertiser_name: asNullableString(findByAliases(row, 'advertiser_name')),
          cycle_id: asNullableString(findByAliases(row, 'cycle_id')),
          assigned_label_code: labelCode,
          assigned_risk_level_code: normalizeRisk(findByAliases(row, 'assigned_risk_level_code')),
          assigned_action_code: asNullableString(findByAliases(row, 'assigned_action_code')),
          score_total: asNullableNumber(findByAliases(row, 'score_total')),
          has_rezago: asNullableBoolean(findByAliases(row, 'has_rezago')),
          sessions_month: asNullableNumber(findByAliases(row, 'sessions_month')),
          open_cases_count: asNullableNumber(findByAliases(row, 'open_cases_count')),
          has_digital_campaign: asNullableBoolean(findByAliases(row, 'has_digital_campaign')),
          trigger_reason_detail: asNullableString(findByAliases(row, 'trigger_reason_detail')),
          trigger_reason_code: asNullableString(findByAliases(row, 'trigger_reason_code')),
          last_contract_date: asNullableString(findByAliases(row, 'last_contract_date')),
          total_contract_amount: asNullableNumber(findByAliases(row, 'total_contract_amount'))
        };

        if (idToLastIndex[advertiserId] !== undefined) {
          normalizedRows[idToLastIndex[advertiserId]] = normalized;
          duplicateCount += 1;
        } else {
          idToLastIndex[advertiserId] = normalizedRows.length;
          normalizedRows.push(normalized);
        }
      });

      if (!normalizedRows.length) {
        throw new Error('No se encontraron filas con clasificacion valida.');
      }

      var inferredCycle = DataLoader.inferCycleId(fileName);
      var firstCycle = normalizedRows.find(function (adv) {
        return !!adv.cycle_id;
      });
      var effectiveCycle = (firstCycle && firstCycle.cycle_id) || inferredCycle || null;

      if (!effectiveCycle) {
        effectiveCycle = prompt('No se pudo inferir el ciclo. Ingresa ciclo YYYY-MM:', '2026-05');
      }

      if (!effectiveCycle) {
        throw new Error('Se requiere un ciclo activo para continuar.');
      }

      normalizedRows.forEach(function (adv) {
        adv.cycle_id = adv.cycle_id || effectiveCycle;
      });

      if (duplicateCount > 0) {
        UI.showToast('Se encontraron ' + duplicateCount + ' IDs duplicados. Se conservo el ultimo.', 'warning');
      }

      return {
        advertisers: normalizedRows,
        cycleId: effectiveCycle
      };
    }
  };

  var FilterEngine = {
    apply: function (advertisers, filterState, indexes) {
      if (!advertisers.length) {
        return [];
      }

      if (APP_CONFIG.REQUIRE_FILTER_TO_SHOW_LIST && !FilterEngine.hasActiveFilters(filterState)) {
        return [];
      }

      var candidates;

      if (filterState.riskLevels.length) {
        candidates = [];
        filterState.riskLevels.forEach(function (risk) {
          candidates = candidates.concat(indexes.byRisk[risk] || []);
        });
      } else {
        candidates = advertisers.slice();
      }

      if (filterState.actionCodes.length) {
        var actionSet = buildIdSetFromIndex(indexes.byAction, filterState.actionCodes);
        candidates = candidates.filter(function (adv) {
          return actionSet.has(adv.advertiser_id);
        });
      }

      if (filterState.labelCodes.length) {
        var labelSet = buildIdSetFromIndex(indexes.byLabel, filterState.labelCodes);
        candidates = candidates.filter(function (adv) {
          return labelSet.has(adv.advertiser_id);
        });
      }

      if (filterState.taggedStatus !== APP_CONFIG.TAGGED_STATUS.ALL) {
        candidates = candidates.filter(function (adv) {
          var tagged = !!TagStore.get(adv.advertiser_id);
          if (filterState.taggedStatus === APP_CONFIG.TAGGED_STATUS.TAGGED) {
            return tagged;
          }
          return !tagged;
        });
      }

      if (filterState.searchText) {
        var needle = filterState.searchText.toLowerCase();
        candidates = candidates.filter(function (adv) {
          return adv.advertiser_id.toLowerCase().indexOf(needle) !== -1 ||
            String(adv.advertiser_name || '').toLowerCase().indexOf(needle) !== -1;
        });
      }

      return sortAdvertisers(candidates, state.sortState.field, state.sortState.direction);
    },

    getDistinctValues: function (advertisers, field) {
      var values = {};
      advertisers.forEach(function (adv) {
        var value = asString(adv[field]).trim();
        if (value) {
          values[value] = true;
        }
      });
      return Object.keys(values).sort();
    },

    hasActiveFilters: function (filterState) {
      return !!(
        filterState.riskLevels.length ||
        filterState.actionCodes.length ||
        filterState.labelCodes.length ||
        filterState.searchText ||
        filterState.taggedStatus !== APP_CONFIG.TAGGED_STATUS.ALL
      );
    }
  };

  var TagStore = (function () {
    var storageKey = null;
    var store = {
      version: '1.0',
      cycle_id: '',
      tags: {}
    };

    function persist() {
      if (!storageKey) {
        return;
      }
      global.localStorage.setItem(storageKey, JSON.stringify(store));
    }

    function sanitizeTags(tags) {
      var allowed = {};
      APP_CONFIG.TAG_TAXONOMY.forEach(function (tag) {
        allowed[tag.code] = true;
      });
      return (tags || []).filter(function (tagCode) {
        return allowed[tagCode];
      });
    }

    return {
      init: function (cycleId) {
        storageKey = APP_CONFIG.LOCALSTORAGE_PREFIX + cycleId;
        var raw = global.localStorage.getItem(storageKey);
        if (raw) {
          try {
            var parsed = JSON.parse(raw);
            if (parsed && parsed.tags) {
              store = {
                version: parsed.version || '1.0',
                cycle_id: parsed.cycle_id || cycleId,
                tags: parsed.tags || {}
              };
            }
          } catch (err) {
            UI.showToast('Store de tags invalido. Se reinicio.', 'warning');
          }
        }

        store.cycle_id = cycleId;
        persist();
      },

      get: function (advertiserId) {
        return store.tags[advertiserId] || null;
      },

      getAll: function () {
        return store.tags;
      },

      set: function (advertiserId, tags, note, taggedBy) {
        var cleanTags = sanitizeTags(tags);
        var cleanNote = String(note || '').slice(0, APP_CONFIG.MAX_NOTE_LENGTH);
        var cleanBy = String(taggedBy || '').trim();

        if (!cleanTags.length && !cleanNote) {
          delete store.tags[advertiserId];
          persist();
          return;
        }

        store.tags[advertiserId] = {
          advertiser_id: advertiserId,
          cycle_id: store.cycle_id,
          tags: cleanTags,
          note: cleanNote,
          tagged_at: new Date().toISOString(),
          tagged_by: cleanBy
        };

        persist();
      },

      exportJSON: function () {
        var latestRecord = null;
        Object.keys(store.tags).forEach(function (key) {
          var current = store.tags[key];
          if (!latestRecord || current.tagged_at > latestRecord.tagged_at) {
            latestRecord = current;
          }
        });

        var payload = {
          version: store.version,
          cycle_id: store.cycle_id,
          exported_at: new Date().toISOString(),
          exported_by: latestRecord ? latestRecord.tagged_by : '',
          total_tagged: Object.keys(store.tags).length,
          tags: store.tags
        };

        return JSON.stringify(payload, null, 2);
      },

      importJSON: function (jsonText, mergeStrategy) {
        var parsed = JSON.parse(jsonText);
        if (!parsed || typeof parsed !== 'object' || !parsed.tags || !parsed.cycle_id) {
          throw new Error('Archivo JSON invalido.');
        }

        if (parsed.cycle_id !== store.cycle_id) {
          var proceed = confirm('El archivo es del ciclo ' + parsed.cycle_id + '. Deseas importarlo de todas formas?');
          if (!proceed) {
            return { imported: 0, skipped: 0 };
          }
        }

        var imported = 0;
        var skipped = 0;
        Object.keys(parsed.tags).forEach(function (advertiserId) {
          var incoming = parsed.tags[advertiserId];
          if (store.tags[advertiserId] && mergeStrategy === 'keep_existing') {
            skipped += 1;
            return;
          }

          store.tags[advertiserId] = {
            advertiser_id: advertiserId,
            cycle_id: store.cycle_id,
            tags: (incoming.tags || []).filter(isKnownTag),
            note: String(incoming.note || '').slice(0, APP_CONFIG.MAX_NOTE_LENGTH),
            tagged_at: incoming.tagged_at || new Date().toISOString(),
            tagged_by: String(incoming.tagged_by || '')
          };
          imported += 1;
        });

        persist();
        return { imported: imported, skipped: skipped };
      },

      exportCSV: function (advertisers) {
        var header = [
          'advertiser_id', 'advertiser_name', 'assigned_label_code',
          'assigned_risk_level_code', 'assigned_action_code', 'score_total',
          'tags', 'note', 'tagged_at', 'tagged_by'
        ];

        var lines = [header.join(',')];
        advertisers.forEach(function (adv) {
          var record = TagStore.get(adv.advertiser_id);
          var row = [
            adv.advertiser_id,
            adv.advertiser_name || '',
            adv.assigned_label_code || '',
            adv.assigned_risk_level_code || '',
            adv.assigned_action_code || '',
            adv.score_total == null ? '' : adv.score_total,
            record ? record.tags.join('|') : '',
            record ? record.note : '',
            record ? record.tagged_at : '',
            record ? record.tagged_by : ''
          ].map(csvEscape);

          lines.push(row.join(','));
        });

        return lines.join('\n');
      },

      clearAll: function () {
        store.tags = {};
        persist();
      },

      getSummary: function () {
        var byTag = {};
        var all = TagStore.getAll();
        var totalTagged = 0;

        Object.keys(all).forEach(function (id) {
          totalTagged += 1;
          (all[id].tags || []).forEach(function (tag) {
            byTag[tag] = (byTag[tag] || 0) + 1;
          });
        });

        return {
          total_advertisers: state.allAdvertisers.length,
          total_tagged: totalTagged,
          total_untagged: Math.max(state.allAdvertisers.length - totalTagged, 0),
          by_tag: byTag
        };
      }
    };
  })();

  var UI = {
    init: function () {
      bindDom();
      wireEvents();
      UI.renderRiskFilter([]);
      UI.renderActionFilter([]);
      UI.renderLabelFilter([]);
      UI.renderList([], 1);
      UI.renderSummary(TagStore.getSummary());
      updateHeaderStatus();
    },

    renderList: function (advertisers, page) {
      var total = advertisers.length;
      var totalPages = Math.max(Math.ceil(total / APP_CONFIG.PAGE_SIZE), 1);
      var currentPage = Math.min(Math.max(page, 1), totalPages);
      state.page = currentPage;

      dom.pageInfo.textContent = 'Pagina ' + currentPage + ' de ' + totalPages;
      dom.btnPrevPage.disabled = currentPage <= 1;
      dom.btnNextPage.disabled = currentPage >= totalPages;

      var start = (currentPage - 1) * APP_CONFIG.PAGE_SIZE;
      var slice = advertisers.slice(start, start + APP_CONFIG.PAGE_SIZE);

      dom.tableBody.innerHTML = '';

      if (!slice.length) {
        var row = document.createElement('tr');
        var cell = document.createElement('td');
        cell.colSpan = 7;
        cell.className = 'empty';
        cell.textContent = state.allAdvertisers.length ? 'No hay resultados para los filtros activos.' : 'Carga un CSV para ver advertisers.';
        row.appendChild(cell);
        dom.tableBody.appendChild(row);
        return;
      }

      slice.forEach(function (adv) {
        var tr = document.createElement('tr');
        tr.className = 'row-selectable';
        tr.dataset.id = adv.advertiser_id;
        if (state.selectedAdvertiserId === adv.advertiser_id) {
          tr.classList.add('row-selected');
        }

        appendCell(tr, adv.advertiser_id);
        appendCell(tr, adv.advertiser_name || 'S/D');
        appendCell(tr, buildBadge(adv.assigned_label_code || 'S/D', APP_CONFIG.LABEL_COLORS[adv.assigned_label_code] || '#556'));
        appendCell(tr, buildBadge(adv.assigned_risk_level_code || 'INDETERMINADO', APP_CONFIG.RISK_COLORS[adv.assigned_risk_level_code] || '#444'));
        appendCell(tr, adv.assigned_action_code || 'S/D');
        appendCell(tr, adv.score_total == null ? 'S/D' : String(adv.score_total));
        appendCell(tr, TagStore.get(adv.advertiser_id) ? buildBadge('Tipificado', '#2f9e44') : '');

        tr.addEventListener('click', function () {
          state.selectedAdvertiserId = adv.advertiser_id;
          setListCollapsed(true);
          UI.renderList(state.filteredAdvertisers, state.page);
          UI.renderProfile(adv);
          UI.renderTagPanel(adv, TagStore.get(adv.advertiser_id));
        });

        dom.tableBody.appendChild(tr);
      });
    },

    renderProfile: function (advertiser) {
      if (!advertiser) {
        dom.profilePanel.innerHTML = '<p class="empty">Selecciona un advertiser de la lista para ver su perfil.</p>';
        return;
      }

      dom.profilePanel.innerHTML = '';
      var wrapper = document.createElement('div');
      wrapper.innerHTML =
        '<div class="profile-head">' +
        '<div><strong>' + escapeHtml(advertiser.advertiser_name || 'S/D') + '</strong> ' +
        UI.badgeHtml(advertiser.assigned_label_code || 'S/D', APP_CONFIG.LABEL_COLORS[advertiser.assigned_label_code] || '#556') + '</div>' +
        '<div>' + UI.badgeHtml('Score: ' + (advertiser.score_total == null ? 'S/D' : advertiser.score_total), '#24344f') + '</div>' +
        '</div>' +
        '<p class="kv">ID: ' + escapeHtml(advertiser.advertiser_id) + ' · Ciclo: ' + escapeHtml(advertiser.cycle_id || 'S/D') + '</p>' +
        '<p class="kv">Riesgo: ' + escapeHtml(advertiser.assigned_risk_level_code || 'S/D') + ' · Accion: ' + escapeHtml(advertiser.assigned_action_code || 'S/D') + '</p>' +
        '<h3 class="section-title">Senales activas</h3>' +
        '<p class="kv">Rezago: ' + humanBoolean(advertiser.has_rezago) + '</p>' +
        '<p class="kv">Casos abiertos: ' + humanValue(advertiser.open_cases_count) + '</p>' +
        '<p class="kv">Sesiones mes: ' + humanValue(advertiser.sessions_month) + '</p>' +
        '<p class="kv">Campana digital: ' + humanBoolean(advertiser.has_digital_campaign) + '</p>' +
        '<h3 class="section-title">Senal principal</h3>' +
        '<p class="kv">' + escapeHtml(advertiser.trigger_reason_detail || 'S/D') + '</p>' +
        '<h3 class="section-title">Datos comerciales</h3>' +
        '<p class="kv">Ultimo contrato: ' + escapeHtml(advertiser.last_contract_date || 'S/D') + '</p>' +
        '<p class="kv">Monto contractual: ' + humanCurrency(advertiser.total_contract_amount) + '</p>';

      dom.profilePanel.appendChild(wrapper);
    },

    renderTagPanel: function (advertiser, tagRecord) {
      if (!advertiser) {
        dom.tagPanel.innerHTML = '<p class="empty">Selecciona un advertiser para tipificar.</p>';
        return;
      }

      var record = tagRecord || {
        tags: [],
        note: '',
        tagged_by: APP_CONFIG.DEFAULT_OPERATOR,
        tagged_at: ''
      };

      dom.tagPanel.innerHTML = '';

      var header = document.createElement('div');
      header.innerHTML =
        '<strong>Tipificacion - ' + escapeHtml(advertiser.advertiser_name || advertiser.advertiser_id) + '</strong>' +
        '<p class="kv">Ultima modificacion: ' + escapeHtml(formatDate(record.tagged_at) || 'S/D') + ' por ' + escapeHtml(record.tagged_by || 'S/D') + '</p>';

      dom.tagPanel.appendChild(header);

      ['estado', 'resultado', 'cierre'].forEach(function (category) {
        var section = document.createElement('section');
        var title = document.createElement('h3');
        title.className = 'section-title';
        title.textContent = APP_CONFIG.TAG_CATEGORY_LABELS[category];
        section.appendChild(title);

        var grid = document.createElement('div');
        grid.className = 'tag-grid';

        APP_CONFIG.TAG_TAXONOMY.filter(function (tag) {
          return tag.category === category;
        }).forEach(function (tag) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tag-pill';
          btn.textContent = tag.label;
          btn.dataset.tagCode = tag.code;

          if (record.tags.indexOf(tag.code) !== -1) {
            btn.classList.add('active');
            btn.style.background = tag.color;
          }

          btn.addEventListener('click', function () {
            var nextTags = toggleTag(record.tags, tag.code);
            TagStore.set(advertiser.advertiser_id, nextTags, noteElement.value, operatorElement.value);
            UI.renderTagPanel(advertiser, TagStore.get(advertiser.advertiser_id));
            refreshDataView(false);
            UI.showToast('Tipificacion guardada', 'success');
          });

          grid.appendChild(btn);
        });

        section.appendChild(grid);
        dom.tagPanel.appendChild(section);
      });

      var warnings = getTagWarnings(record.tags);
      if (warnings.length) {
        var warningNode = document.createElement('p');
        warningNode.className = 'kv';
        warningNode.style.color = '#8b5e00';
        warningNode.textContent = 'Advertencia: ' + warnings.join(' | ');
        dom.tagPanel.appendChild(warningNode);
      }

      var operatorLabel = document.createElement('label');
      operatorLabel.className = 'field-label';
      operatorLabel.textContent = 'Operador';
      dom.tagPanel.appendChild(operatorLabel);

      var operatorElement = document.createElement('input');
      operatorElement.className = 'tag-input';
      operatorElement.type = 'text';
      operatorElement.maxLength = 80;
      operatorElement.value = record.tagged_by || '';
      operatorElement.addEventListener('input', function () {
        TagStore.set(advertiser.advertiser_id, record.tags, noteElement.value, operatorElement.value);
        refreshDataView(false);
      });
      dom.tagPanel.appendChild(operatorElement);

      var noteLabel = document.createElement('label');
      noteLabel.className = 'field-label';
      noteLabel.textContent = 'Nota';
      dom.tagPanel.appendChild(noteLabel);

      var noteElement = document.createElement('textarea');
      noteElement.maxLength = APP_CONFIG.MAX_NOTE_LENGTH;
      noteElement.value = record.note || '';
      dom.tagPanel.appendChild(noteElement);

      var meta = document.createElement('div');
      meta.className = 'inline-meta';
      var counter = document.createElement('span');
      counter.textContent = noteElement.value.length + ' / ' + APP_CONFIG.MAX_NOTE_LENGTH;
      var saved = document.createElement('span');
      saved.textContent = 'Autoguardado';
      meta.appendChild(counter);
      meta.appendChild(saved);
      dom.tagPanel.appendChild(meta);

      noteElement.addEventListener('input', function () {
        counter.textContent = noteElement.value.length + ' / ' + APP_CONFIG.MAX_NOTE_LENGTH;

        clearTimeout(state.noteSaveTimer);
        state.noteSaveTimer = setTimeout(function () {
          TagStore.set(advertiser.advertiser_id, record.tags, noteElement.value, operatorElement.value);
          refreshDataView(false);
          UI.showToast('Nota guardada', 'success');
        }, APP_CONFIG.DEBOUNCE_NOTE_MS);
      });

      UI.renderSummary(TagStore.getSummary());
    },

    renderSummary: function (summary) {
      dom.quickSummary.textContent = summary.total_tagged + ' / ' + summary.total_advertisers + ' tipificados';
      dom.btnExportJson.disabled = summary.total_tagged === 0;
      dom.btnClearTags.disabled = summary.total_tagged === 0;

      var wrap = document.createElement('div');
      wrap.className = 'summary-wrap';
      Object.keys(summary.by_tag).sort().forEach(function (tagCode) {
        var item = document.createElement('div');
        item.className = 'summary-item';
        item.textContent = tagCode + ': ' + summary.by_tag[tagCode];
        wrap.appendChild(item);
      });

      var existing = dom.tagPanel.querySelector('.summary-wrap');
      if (existing) {
        existing.remove();
      }

      if (wrap.children.length > 0) {
        dom.tagPanel.appendChild(wrap);
      }
    },

    renderRiskFilter: function (values) {
      dom.riskFilter.innerHTML = '';

      values.forEach(function (risk) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'risk-pill';
        btn.textContent = risk;

        if (state.filterState.riskLevels.indexOf(risk) !== -1) {
          btn.classList.add('active');
          btn.style.background = APP_CONFIG.RISK_COLORS[risk] || '#4a5568';
        }

        btn.addEventListener('click', function () {
          state.filterState.riskLevels = toggleTag(state.filterState.riskLevels, risk);
          refreshDataView(true);
        });

        dom.riskFilter.appendChild(btn);
      });
    },

    renderActionFilter: function (values) {
      updateMultiSelect(dom.actionFilter, values, state.filterState.actionCodes);
    },

    renderLabelFilter: function (values) {
      updateMultiSelect(dom.labelFilter, values, state.filterState.labelCodes);
    },

    showToast: function (message, type) {
      clearTimeout(state.toastTimer);
      dom.toast.className = 'toast';
      if (type) {
        dom.toast.classList.add(type);
      }
      dom.toast.textContent = message;
      dom.toast.classList.remove('hidden');

      state.toastTimer = setTimeout(function () {
        dom.toast.classList.add('hidden');
      }, 2200);
    },

    updateCounters: function (filteredCount, totalCount) {
      dom.resultCounter.textContent = filteredCount + ' de ' + totalCount + ' advertisers';
    },

    downloadFile: function (content, filename, mimeType) {
      var blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },

    badgeHtml: function (text, color) {
      return '<span class="badge" style="background:' + escapeHtml(color) + ';color:#fff">' + escapeHtml(text) + '</span>';
    }
  };

  function bindDom() {
    dom.btnLoadCsv = document.getElementById('btnLoadCsv');
    dom.btnExportJson = document.getElementById('btnExportJson');
    dom.btnImportJson = document.getElementById('btnImportJson');
    dom.btnExportCsv = document.getElementById('btnExportCsv');
    dom.btnClearTags = document.getElementById('btnClearTags');
    dom.csvFileInput = document.getElementById('csvFileInput');
    dom.jsonFileInput = document.getElementById('jsonFileInput');

    dom.searchInput = document.getElementById('searchInput');
    dom.riskFilter = document.getElementById('riskFilter');
    dom.actionFilter = document.getElementById('actionFilter');
    dom.labelFilter = document.getElementById('labelFilter');
    dom.btnClearFilters = document.getElementById('btnClearFilters');
    dom.resultCounter = document.getElementById('resultCounter');
    dom.filterHint = document.getElementById('filterHint');
    dom.focusToolbar = document.getElementById('focusToolbar');
    dom.focusStatus = document.getElementById('focusStatus');
    dom.btnToggleListPanel = document.getElementById('btnToggleListPanel');

    dom.tableBody = document.getElementById('tableBody');
    dom.btnPrevPage = document.getElementById('btnPrevPage');
    dom.btnNextPage = document.getElementById('btnNextPage');
    dom.pageInfo = document.getElementById('pageInfo');

    dom.profilePanel = document.getElementById('profilePanel');
    dom.tagPanel = document.getElementById('tagPanel');
    dom.layout = document.querySelector('.layout');

    dom.appTitle = document.getElementById('appTitle');
    dom.cycleBadge = document.getElementById('cycleBadge');
    dom.dataBadge = document.getElementById('dataBadge');
    dom.quickSummary = document.getElementById('quickSummary');

    dom.toast = document.getElementById('toast');
  }

  function wireEvents() {
    dom.btnLoadCsv.addEventListener('click', function () {
      dom.csvFileInput.click();
    });

    dom.csvFileInput.addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      handleCsvLoad(file);
    });

    dom.btnImportJson.addEventListener('click', function () {
      if (!state.cycleId) {
        UI.showToast('Primero carga un CSV para definir el ciclo.', 'warning');
        return;
      }
      dom.jsonFileInput.click();
    });

    dom.jsonFileInput.addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        try {
          var mergeStrategy = confirm('Aceptar para reemplazar existentes. Cancelar para mantener locales.') ? 'replace' : 'keep_existing';
          var result = TagStore.importJSON(reader.result, mergeStrategy);
          refreshDataView(false);
          UI.showToast('Importados: ' + result.imported + ', Omitidos: ' + result.skipped, 'success');
        } catch (err) {
          UI.showToast(err.message || 'Error al importar JSON', 'error');
        }
      };
      reader.onerror = function () {
        UI.showToast('No se pudo leer el archivo JSON.', 'error');
      };
      reader.readAsText(file);
    });

    dom.btnExportJson.addEventListener('click', function () {
      var json = TagStore.exportJSON();
      var now = new Date();
      var fileName = 'tags_' + state.cycleId + '_' +
        String(now.getFullYear()) +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') + '.json';

      UI.downloadFile(json, fileName, 'application/json');
      UI.showToast('Archivo JSON exportado', 'success');
    });

    dom.btnExportCsv.addEventListener('click', function () {
      var csv = TagStore.exportCSV(state.filteredAdvertisers);
      var fileName = 'lista_retencion_' + (state.cycleId || 'sin_ciclo') + '.csv';
      UI.downloadFile(csv, fileName, 'text/csv;charset=utf-8');
      UI.showToast('CSV exportado', 'success');
    });

    dom.btnClearTags.addEventListener('click', function () {
      var ok = confirm('Se eliminaran todos los tags del ciclo activo. Continuar?');
      if (!ok) {
        return;
      }
      TagStore.clearAll();
      refreshDataView(false);
      UI.showToast('Tags eliminados', 'success');
    });

    dom.searchInput.addEventListener('input', function (event) {
      clearTimeout(state.searchDebounceTimer);
      state.searchDebounceTimer = setTimeout(function () {
        state.filterState.searchText = String(event.target.value || '').trim();
        refreshDataView(true);
      }, APP_CONFIG.DEBOUNCE_SEARCH_MS);
    });

    dom.actionFilter.addEventListener('change', function () {
      state.filterState.actionCodes = readSelectedValues(dom.actionFilter);
      refreshDataView(true);
    });

    dom.labelFilter.addEventListener('change', function () {
      state.filterState.labelCodes = readSelectedValues(dom.labelFilter);
      refreshDataView(true);
    });

    document.querySelectorAll('input[name="taggedStatus"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        state.filterState.taggedStatus = radio.value;
        refreshDataView(true);
      });
    });

    dom.btnClearFilters.addEventListener('click', function () {
      resetFilters();
      refreshDataView(true);
    });

    dom.btnToggleListPanel.addEventListener('click', function () {
      if (!state.selectedAdvertiserId) {
        UI.showToast('Selecciona un advertiser para activar el modo foco.', 'info');
        return;
      }
      setListCollapsed(!state.isListCollapsed);
    });

    dom.btnPrevPage.addEventListener('click', function () {
      if (state.page > 1) {
        UI.renderList(state.filteredAdvertisers, state.page - 1);
      }
    });

    dom.btnNextPage.addEventListener('click', function () {
      var totalPages = Math.max(Math.ceil(state.filteredAdvertisers.length / APP_CONFIG.PAGE_SIZE), 1);
      if (state.page < totalPages) {
        UI.renderList(state.filteredAdvertisers, state.page + 1);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (!state.filteredAdvertisers.length || !state.selectedAdvertiserId) {
        return;
      }

      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return;
      }

      var currentIndex = state.filteredAdvertisers.findIndex(function (adv) {
        return adv.advertiser_id === state.selectedAdvertiserId;
      });

      if (currentIndex < 0) {
        return;
      }

      var nextIndex = event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex < 0 || nextIndex >= state.filteredAdvertisers.length) {
        return;
      }

      var nextAdv = state.filteredAdvertisers[nextIndex];
      state.selectedAdvertiserId = nextAdv.advertiser_id;
      setListCollapsed(true);
      var targetPage = Math.floor(nextIndex / APP_CONFIG.PAGE_SIZE) + 1;

      UI.renderList(state.filteredAdvertisers, targetPage);
      UI.renderProfile(nextAdv);
      UI.renderTagPanel(nextAdv, TagStore.get(nextAdv.advertiser_id));
    });
  }

  function handleCsvLoad(file) {
    dom.dataBadge.textContent = 'Procesando...';
    dom.dataBadge.className = 'badge warning';

    DataLoader.parseCSV(file)
      .then(function (parsed) {
        state.allAdvertisers = sortAdvertisers(parsed.advertisers, 'score_total', 'desc');
        state.cycleId = parsed.cycleId;
        state.indexes = DataLoader.buildIndexes(state.allAdvertisers);
        TagStore.init(state.cycleId);
        state.selectedAdvertiserId = null;
        setListCollapsed(false);

        populateFilters();
        resetFilters();
        refreshDataView(true);
        updateHeaderStatus();

        dom.btnExportCsv.disabled = false;
        UI.showToast(state.allAdvertisers.length + ' advertisers cargados.', 'success');
      })
      .catch(function (err) {
        UI.showToast(err.message || 'Error al cargar CSV.', 'error');
        updateHeaderStatus();
      })
      .finally(function () {
        dom.csvFileInput.value = '';
      });
  }

  function refreshDataView(resetPage) {
    if (resetPage) {
      state.page = 1;
    }

    state.filteredAdvertisers = FilterEngine.apply(state.allAdvertisers, state.filterState, state.indexes);
    UI.updateCounters(state.filteredAdvertisers.length, state.allAdvertisers.length);
    UI.renderList(state.filteredAdvertisers, state.page);
    UI.renderRiskFilter(FilterEngine.getDistinctValues(state.allAdvertisers, 'assigned_risk_level_code'));

    if (!state.selectedAdvertiserId) {
      UI.renderProfile(null);
      UI.renderTagPanel(null, null);
    } else {
      var selected = state.allAdvertisers.find(function (adv) {
        return adv.advertiser_id === state.selectedAdvertiserId;
      });

      if (selected) {
        UI.renderProfile(selected);
        UI.renderTagPanel(selected, TagStore.get(selected.advertiser_id));
      }
    }

    UI.renderSummary(TagStore.getSummary());
    updateFilterHint();
    updateHeaderStatus();
    updateFocusModeUI();
  }

  function resetFilters() {
    state.filterState = {
      riskLevels: [],
      actionCodes: [],
      labelCodes: [],
      searchText: '',
      taggedStatus: APP_CONFIG.TAGGED_STATUS.ALL
    };

    dom.searchInput.value = '';
    clearSelect(dom.actionFilter);
    clearSelect(dom.labelFilter);
    document.querySelector('input[name="taggedStatus"][value="ALL"]').checked = true;
  }

  function populateFilters() {
    var riskValues = FilterEngine.getDistinctValues(state.allAdvertisers, 'assigned_risk_level_code').sort(byRiskOrder);
    var actionValues = FilterEngine.getDistinctValues(state.allAdvertisers, 'assigned_action_code');
    var labelValues = FilterEngine.getDistinctValues(state.allAdvertisers, 'assigned_label_code');

    UI.renderRiskFilter(riskValues);
    UI.renderActionFilter(actionValues);
    UI.renderLabelFilter(labelValues);
  }

  function updateHeaderStatus() {
    dom.cycleBadge.textContent = 'Ciclo: ' + (state.cycleId || 'Sin definir');
    if (!state.allAdvertisers.length) {
      dom.dataBadge.textContent = 'Sin datos';
      dom.dataBadge.className = 'badge warning';
    } else {
      dom.dataBadge.textContent = state.allAdvertisers.length + ' advertisers cargados';
      dom.dataBadge.className = 'badge success';
    }
  }

  function updateFilterHint() {
    var shouldShow = APP_CONFIG.REQUIRE_FILTER_TO_SHOW_LIST && state.allAdvertisers.length > 0 && !FilterEngine.hasActiveFilters(state.filterState);
    dom.filterHint.classList.toggle('hidden', !shouldShow);
  }

  function setListCollapsed(collapsed) {
    state.isListCollapsed = !!collapsed;
    updateFocusModeUI();
  }

  function updateFocusModeUI() {
    var hasSelection = !!state.selectedAdvertiserId;

    dom.focusToolbar.classList.toggle('hidden', !hasSelection);

    if (!hasSelection) {
      dom.layout.classList.remove('list-collapsed');
      dom.focusStatus.textContent = 'Vista normal';
      dom.btnToggleListPanel.textContent = 'Mostrar foco';
      return;
    }

    if (state.isListCollapsed) {
      dom.layout.classList.add('list-collapsed');
      dom.focusStatus.textContent = 'Modo foco activado: lista contraida';
      dom.btnToggleListPanel.textContent = 'Mostrar lista';
    } else {
      dom.layout.classList.remove('list-collapsed');
      dom.focusStatus.textContent = 'Vista normal: lista desplegada';
      dom.btnToggleListPanel.textContent = 'Mostrar foco';
    }
  }

  function normalizeHeader(header) {
    return String(header || '')
      .replace(/^\uFEFF/, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/__+/g, '_');
  }

  function normalizeRowKeys(row) {
    var normalized = {};
    Object.keys(row || {}).forEach(function (key) {
      normalized[normalizeHeader(key)] = row[key];
    });
    return normalized;
  }

  function findByAliases(row, canonicalKey) {
    var aliases = APP_CONFIG.COLUMN_ALIASES[canonicalKey] || [canonicalKey];
    var value;
    var i;

    for (i = 0; i < aliases.length; i += 1) {
      value = row[normalizeHeader(aliases[i])];
      if (value !== undefined && String(value).trim() !== '') {
        return value;
      }
    }
    return row[canonicalKey];
  }

  function hasAnyAliasHeader(headerKeys, canonicalKey) {
    var aliases = APP_CONFIG.COLUMN_ALIASES[canonicalKey] || [canonicalKey];
    return aliases.some(function (alias) {
      return headerKeys.indexOf(normalizeHeader(alias)) !== -1;
    });
  }

  function asString(value) {
    return value == null ? '' : String(value);
  }

  function asNullableString(value) {
    var text = asString(value).trim();
    if (!text || text.toLowerCase() === 'null') {
      return null;
    }
    return text;
  }

  function asNullableNumber(value) {
    var text = asString(value).trim().replace(/,/g, '');
    if (!text || text.toLowerCase() === 'null') {
      return null;
    }
    var num = Number(text);
    return isNaN(num) ? null : num;
  }

  function asNullableBoolean(value) {
    var text = asString(value).trim().toLowerCase();
    if (!text || text === 'null') {
      return null;
    }
    if (['1', 'true', 'yes', 'si', 's\u00ed'].indexOf(text) !== -1) {
      return true;
    }
    if (['0', 'false', 'no'].indexOf(text) !== -1) {
      return false;
    }
    return null;
  }

  function normalizeRisk(value) {
    var text = asString(value).trim().toUpperCase();
    if (!text || text === '-' || text === '\u2014') {
      return 'INDETERMINADO';
    }
    return text;
  }

  function addToIndex(indexObj, key, record) {
    if (!indexObj[key]) {
      indexObj[key] = [];
    }
    indexObj[key].push(record);
  }

  function buildIdSetFromIndex(indexObj, keys) {
    var set = new Set();
    keys.forEach(function (key) {
      (indexObj[key] || []).forEach(function (adv) {
        set.add(adv.advertiser_id);
      });
    });
    return set;
  }

  function updateMultiSelect(selectElement, values, selectedValues) {
    var previous = {};
    (selectedValues || []).forEach(function (v) {
      previous[v] = true;
    });

    selectElement.innerHTML = '';
    values.forEach(function (value) {
      var option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = !!previous[value];
      selectElement.appendChild(option);
    });

    selectElement.size = Math.min(Math.max(values.length, 1), 6);
  }

  function clearSelect(selectElement) {
    Array.from(selectElement.options).forEach(function (option) {
      option.selected = false;
    });
  }

  function readSelectedValues(selectElement) {
    return Array.from(selectElement.selectedOptions).map(function (option) {
      return option.value;
    });
  }

  function sortAdvertisers(advertisers, field, direction) {
    var list = advertisers.slice();
    list.sort(function (a, b) {
      var av = a[field];
      var bv = b[field];

      if (av == null && bv == null) {
        return 0;
      }
      if (av == null) {
        return 1;
      }
      if (bv == null) {
        return -1;
      }

      if (typeof av === 'number' && typeof bv === 'number') {
        return direction === 'asc' ? av - bv : bv - av;
      }

      var aa = String(av).toLowerCase();
      var bb = String(bv).toLowerCase();
      if (aa < bb) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aa > bb) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return list;
  }

  function byRiskOrder(a, b) {
    return APP_CONFIG.RISK_ORDER.indexOf(a) - APP_CONFIG.RISK_ORDER.indexOf(b);
  }

  function appendCell(tr, content) {
    var td = document.createElement('td');
    if (typeof content === 'string') {
      if (content.indexOf('<span') === 0) {
        td.innerHTML = content;
      } else {
        td.textContent = content;
      }
    } else {
      td.textContent = String(content || '');
    }
    tr.appendChild(td);
  }

  function buildBadge(text, color) {
    return '<span class="badge" style="background:' + escapeHtml(color) + ';color:#fff">' + escapeHtml(text) + '</span>';
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function csvEscape(value) {
    var text = String(value == null ? '' : value);
    if (text.indexOf(',') !== -1 || text.indexOf('"') !== -1 || text.indexOf('\n') !== -1) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function toggleTag(list, value) {
    var next = (list || []).slice();
    var idx = next.indexOf(value);
    if (idx >= 0) {
      next.splice(idx, 1);
    } else {
      next.push(value);
    }
    return next;
  }

  function isKnownTag(tagCode) {
    return APP_CONFIG.TAG_TAXONOMY.some(function (tag) {
      return tag.code === tagCode;
    });
  }

  function getTagWarnings(tags) {
    var list = tags || [];
    var warnings = [];

    if (list.indexOf('CERRADO_EXITOSO') !== -1 && list.indexOf('CERRADO_SIN_RESOLUCION') !== -1) {
      warnings.push('Cierre exitoso y sin resolucion son contradictorios');
    }
    if (list.indexOf('INTERESADO') !== -1 && list.indexOf('SIN_INTERES') !== -1) {
      warnings.push('Interesado y sin interes son opuestos');
    }
    if (list.indexOf('NO_CONTACTA') !== -1 && list.indexOf('ACUERDO_ALCANZADO') !== -1) {
      warnings.push('No contacta no suele coexistir con acuerdo alcanzado');
    }

    return warnings;
  }

  function humanBoolean(value) {
    if (value == null) {
      return 'S/D';
    }
    return value ? 'Si' : 'No';
  }

  function humanValue(value) {
    return value == null ? 'S/D' : String(value);
  }

  function humanCurrency(value) {
    if (value == null) {
      return 'S/D';
    }
    return '$' + Number(value).toLocaleString('es-PE');
  }

  function formatDate(value) {
    if (!value) {
      return '';
    }
    if (global.dayjs) {
      return dayjs(value).format('DD/MM/YYYY HH:mm');
    }
    var d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
  }

  UI.init();

  global.RetentionApp = {
    DataLoader: DataLoader,
    FilterEngine: FilterEngine,
    TagStore: TagStore,
    UI: UI,
    state: state
  };
})(window);
