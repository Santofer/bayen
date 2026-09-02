--
-- PostgreSQL database dump
--

\restrict j3cALOqh3DmxjPpXXFDnmrfGY5G7UaU3aG7D5VHCVbLSpD0eDNjKcaNUuIP3CUR

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: additives; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.additives (
    id character varying(10) NOT NULL,
    name_fr character varying(255) NOT NULL,
    function character varying(100),
    risk_level character varying(20) NOT NULL,
    description_fr text,
    sources json,
    name_ar character varying(255),
    function_ar character varying(255),
    description_ar text
);


ALTER TABLE public.additives OWNER TO bayen_user;

--
-- Name: ai_logs; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.ai_logs (
    id uuid NOT NULL,
    product_id uuid,
    type character varying(20) NOT NULL,
    input text,
    output text,
    duration_ms integer,
    success boolean NOT NULL,
    error_message character varying(500),
    date_created timestamp with time zone NOT NULL
);


ALTER TABLE public.ai_logs OWNER TO bayen_user;

--
-- Name: articles; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug character varying(120) NOT NULL,
    title_fr character varying(200) NOT NULL,
    title_ar character varying(200),
    excerpt_fr character varying(300),
    excerpt_ar character varying(300),
    content_fr text NOT NULL,
    content_ar text,
    cover_image uuid,
    category character varying(20) DEFAULT 'bien-etre'::character varying NOT NULL,
    reading_time_min integer,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    date_published timestamp with time zone,
    date_created timestamp with time zone DEFAULT now() NOT NULL,
    date_updated timestamp with time zone,
    created_by uuid
);


ALTER TABLE public.articles OWNER TO bayen_user;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name_fr character varying(100) NOT NULL,
    name_ar character varying(100),
    slug character varying(100) NOT NULL,
    parent_id integer,
    icon character varying(50)
);


ALTER TABLE public.categories OWNER TO bayen_user;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO bayen_user;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: contributions; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.contributions (
    id uuid NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    data_before json,
    data_after json,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by uuid,
    date_created timestamp with time zone NOT NULL,
    points_awarded boolean DEFAULT false NOT NULL
);


ALTER TABLE public.contributions OWNER TO bayen_user;

--
-- Name: directus_access; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_access (
    id uuid NOT NULL,
    role uuid,
    "user" uuid,
    policy uuid NOT NULL,
    sort integer
);


ALTER TABLE public.directus_access OWNER TO bayen_user;

--
-- Name: directus_activity; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_activity (
    id integer NOT NULL,
    action character varying(45) NOT NULL,
    "user" uuid,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip character varying(50),
    user_agent text,
    collection character varying(64) NOT NULL,
    item character varying(255) NOT NULL,
    origin character varying(255)
);


ALTER TABLE public.directus_activity OWNER TO bayen_user;

--
-- Name: directus_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.directus_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directus_activity_id_seq OWNER TO bayen_user;

--
-- Name: directus_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.directus_activity_id_seq OWNED BY public.directus_activity.id;


--
-- Name: directus_collections; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_collections (
    collection character varying(64) NOT NULL,
    icon character varying(64),
    note text,
    display_template character varying(255),
    hidden boolean DEFAULT false NOT NULL,
    singleton boolean DEFAULT false NOT NULL,
    translations json,
    archive_field character varying(64),
    archive_app_filter boolean DEFAULT true NOT NULL,
    archive_value character varying(255),
    unarchive_value character varying(255),
    sort_field character varying(64),
    accountability character varying(255) DEFAULT 'all'::character varying,
    color character varying(255),
    item_duplication_fields json,
    sort integer,
    "group" character varying(64),
    collapse character varying(255) DEFAULT 'open'::character varying NOT NULL,
    preview_url character varying(255),
    versioning boolean DEFAULT false NOT NULL
);


ALTER TABLE public.directus_collections OWNER TO bayen_user;

--
-- Name: directus_comments; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_comments (
    id uuid NOT NULL,
    collection character varying(64) NOT NULL,
    item character varying(255) NOT NULL,
    comment text NOT NULL,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    user_updated uuid
);


ALTER TABLE public.directus_comments OWNER TO bayen_user;

--
-- Name: directus_dashboards; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_dashboards (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    icon character varying(64) DEFAULT 'dashboard'::character varying NOT NULL,
    note text,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    color character varying(255)
);


ALTER TABLE public.directus_dashboards OWNER TO bayen_user;

--
-- Name: directus_deployment_projects; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_deployment_projects (
    id uuid NOT NULL,
    deployment uuid NOT NULL,
    external_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    url character varying(255),
    framework character varying(255),
    deployable boolean DEFAULT true NOT NULL
);


ALTER TABLE public.directus_deployment_projects OWNER TO bayen_user;

--
-- Name: directus_deployment_runs; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_deployment_runs (
    id uuid NOT NULL,
    project uuid NOT NULL,
    external_id character varying(255) NOT NULL,
    target character varying(255) NOT NULL,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    status character varying(255),
    url character varying(255),
    started_at timestamp with time zone,
    completed_at timestamp with time zone
);


ALTER TABLE public.directus_deployment_runs OWNER TO bayen_user;

--
-- Name: directus_deployments; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_deployments (
    id uuid NOT NULL,
    provider character varying(255) NOT NULL,
    credentials text,
    options text,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    webhook_ids json,
    webhook_secret character varying(255),
    last_synced_at timestamp with time zone
);


ALTER TABLE public.directus_deployments OWNER TO bayen_user;

--
-- Name: directus_extensions; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_extensions (
    enabled boolean DEFAULT true NOT NULL,
    id uuid NOT NULL,
    folder character varying(255) NOT NULL,
    source character varying(255) NOT NULL,
    bundle uuid
);


ALTER TABLE public.directus_extensions OWNER TO bayen_user;

--
-- Name: directus_fields; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_fields (
    id integer NOT NULL,
    collection character varying(64) NOT NULL,
    field character varying(64) NOT NULL,
    special character varying(64),
    interface character varying(64),
    options json,
    display character varying(64),
    display_options json,
    readonly boolean DEFAULT false NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    sort integer,
    width character varying(30) DEFAULT 'full'::character varying,
    translations json,
    note text,
    conditions json,
    required boolean DEFAULT false,
    "group" character varying(64),
    validation json,
    validation_message text,
    searchable boolean DEFAULT true NOT NULL
);


ALTER TABLE public.directus_fields OWNER TO bayen_user;

--
-- Name: directus_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.directus_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directus_fields_id_seq OWNER TO bayen_user;

--
-- Name: directus_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.directus_fields_id_seq OWNED BY public.directus_fields.id;


--
-- Name: directus_files; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_files (
    id uuid NOT NULL,
    storage character varying(255) NOT NULL,
    filename_disk character varying(255),
    filename_download character varying(255) NOT NULL,
    title character varying(255),
    type character varying(255),
    folder uuid,
    uploaded_by uuid,
    created_on timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modified_by uuid,
    modified_on timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    charset character varying(50),
    filesize bigint,
    width integer,
    height integer,
    duration integer,
    embed character varying(200),
    description text,
    location text,
    tags text,
    metadata json,
    focal_point_x integer,
    focal_point_y integer,
    tus_id character varying(64),
    tus_data json,
    uploaded_on timestamp with time zone
);


ALTER TABLE public.directus_files OWNER TO bayen_user;

--
-- Name: directus_flows; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_flows (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    icon character varying(64),
    color character varying(255),
    description text,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    trigger character varying(255),
    accountability character varying(255) DEFAULT 'all'::character varying,
    options json,
    operation uuid,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid
);


ALTER TABLE public.directus_flows OWNER TO bayen_user;

--
-- Name: directus_folders; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_folders (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    parent uuid
);


ALTER TABLE public.directus_folders OWNER TO bayen_user;

--
-- Name: directus_migrations; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_migrations (
    version character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.directus_migrations OWNER TO bayen_user;

--
-- Name: directus_notifications; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_notifications (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(255) DEFAULT 'inbox'::character varying,
    recipient uuid NOT NULL,
    sender uuid,
    subject character varying(255) NOT NULL,
    message text,
    collection character varying(64),
    item character varying(255)
);


ALTER TABLE public.directus_notifications OWNER TO bayen_user;

--
-- Name: directus_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.directus_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directus_notifications_id_seq OWNER TO bayen_user;

--
-- Name: directus_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.directus_notifications_id_seq OWNED BY public.directus_notifications.id;


--
-- Name: directus_operations; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_operations (
    id uuid NOT NULL,
    name character varying(255),
    key character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    position_x integer NOT NULL,
    position_y integer NOT NULL,
    options json,
    resolve uuid,
    reject uuid,
    flow uuid NOT NULL,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid
);


ALTER TABLE public.directus_operations OWNER TO bayen_user;

--
-- Name: directus_panels; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_panels (
    id uuid NOT NULL,
    dashboard uuid NOT NULL,
    name character varying(255),
    icon character varying(64) DEFAULT NULL::character varying,
    color character varying(10),
    show_header boolean DEFAULT false NOT NULL,
    note text,
    type character varying(255) NOT NULL,
    position_x integer NOT NULL,
    position_y integer NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    options json,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid
);


ALTER TABLE public.directus_panels OWNER TO bayen_user;

--
-- Name: directus_permissions; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_permissions (
    id integer NOT NULL,
    collection character varying(64) NOT NULL,
    action character varying(10) NOT NULL,
    permissions json,
    validation json,
    presets json,
    fields text,
    policy uuid NOT NULL
);


ALTER TABLE public.directus_permissions OWNER TO bayen_user;

--
-- Name: directus_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.directus_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directus_permissions_id_seq OWNER TO bayen_user;

--
-- Name: directus_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.directus_permissions_id_seq OWNED BY public.directus_permissions.id;


--
-- Name: directus_policies; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_policies (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(64) DEFAULT 'badge'::character varying NOT NULL,
    description text,
    ip_access text,
    enforce_tfa boolean DEFAULT false NOT NULL,
    admin_access boolean DEFAULT false NOT NULL,
    app_access boolean DEFAULT false NOT NULL
);


ALTER TABLE public.directus_policies OWNER TO bayen_user;

--
-- Name: directus_presets; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_presets (
    id integer NOT NULL,
    bookmark character varying(255),
    "user" uuid,
    role uuid,
    collection character varying(64),
    search character varying(100),
    layout character varying(100) DEFAULT 'tabular'::character varying,
    layout_query json,
    layout_options json,
    refresh_interval integer,
    filter json,
    icon character varying(64) DEFAULT 'bookmark'::character varying,
    color character varying(255)
);


ALTER TABLE public.directus_presets OWNER TO bayen_user;

--
-- Name: directus_presets_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.directus_presets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directus_presets_id_seq OWNER TO bayen_user;

--
-- Name: directus_presets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.directus_presets_id_seq OWNED BY public.directus_presets.id;


--
-- Name: directus_relations; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_relations (
    id integer NOT NULL,
    many_collection character varying(64) NOT NULL,
    many_field character varying(64) NOT NULL,
    one_collection character varying(64),
    one_field character varying(64),
    one_collection_field character varying(64),
    one_allowed_collections text,
    junction_field character varying(64),
    sort_field character varying(64),
    one_deselect_action character varying(255) DEFAULT 'nullify'::character varying NOT NULL
);


ALTER TABLE public.directus_relations OWNER TO bayen_user;

--
-- Name: directus_relations_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.directus_relations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directus_relations_id_seq OWNER TO bayen_user;

--
-- Name: directus_relations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.directus_relations_id_seq OWNED BY public.directus_relations.id;


--
-- Name: directus_revisions; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_revisions (
    id integer NOT NULL,
    activity integer NOT NULL,
    collection character varying(64) NOT NULL,
    item character varying(255) NOT NULL,
    data json,
    delta json,
    parent integer,
    version uuid
);


ALTER TABLE public.directus_revisions OWNER TO bayen_user;

--
-- Name: directus_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.directus_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directus_revisions_id_seq OWNER TO bayen_user;

--
-- Name: directus_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.directus_revisions_id_seq OWNED BY public.directus_revisions.id;


--
-- Name: directus_roles; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_roles (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(64) DEFAULT 'supervised_user_circle'::character varying NOT NULL,
    description text,
    parent uuid
);


ALTER TABLE public.directus_roles OWNER TO bayen_user;

--
-- Name: directus_sessions; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_sessions (
    token character varying(64) NOT NULL,
    "user" uuid,
    expires timestamp with time zone NOT NULL,
    ip character varying(255),
    user_agent text,
    share uuid,
    origin character varying(255),
    next_token character varying(64)
);


ALTER TABLE public.directus_sessions OWNER TO bayen_user;

--
-- Name: directus_settings; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_settings (
    id integer NOT NULL,
    project_name character varying(100) DEFAULT 'Directus'::character varying NOT NULL,
    project_url character varying(255),
    project_color character varying(255) DEFAULT '#6644FF'::character varying NOT NULL,
    project_logo uuid,
    public_foreground uuid,
    public_background uuid,
    public_note text,
    auth_login_attempts integer DEFAULT 25,
    auth_password_policy character varying(100),
    storage_asset_transform character varying(7) DEFAULT 'all'::character varying,
    storage_asset_presets json,
    custom_css text,
    storage_default_folder uuid,
    basemaps json,
    mapbox_key character varying(255),
    module_bar json,
    project_descriptor character varying(100),
    default_language character varying(255) DEFAULT 'en-US'::character varying NOT NULL,
    custom_aspect_ratios json,
    public_favicon uuid,
    default_appearance character varying(255) DEFAULT 'auto'::character varying NOT NULL,
    default_theme_light character varying(255),
    theme_light_overrides json,
    default_theme_dark character varying(255),
    theme_dark_overrides json,
    report_error_url character varying(255),
    report_bug_url character varying(255),
    report_feature_url character varying(255),
    public_registration boolean DEFAULT false NOT NULL,
    public_registration_verify_email boolean DEFAULT true NOT NULL,
    public_registration_role uuid,
    public_registration_email_filter json,
    visual_editor_urls json,
    project_id uuid,
    mcp_enabled boolean DEFAULT false NOT NULL,
    mcp_allow_deletes boolean DEFAULT false NOT NULL,
    mcp_prompts_collection character varying(255) DEFAULT NULL::character varying,
    mcp_system_prompt_enabled boolean DEFAULT true NOT NULL,
    mcp_system_prompt text,
    project_owner character varying(255),
    project_usage character varying(255),
    org_name character varying(255),
    product_updates boolean,
    project_status character varying(255),
    ai_openai_api_key text,
    ai_anthropic_api_key text,
    ai_system_prompt text,
    ai_google_api_key text,
    ai_openai_compatible_api_key text,
    ai_openai_compatible_base_url text,
    ai_openai_compatible_name text,
    ai_openai_compatible_models json,
    ai_openai_compatible_headers json,
    ai_openai_allowed_models json,
    ai_anthropic_allowed_models json,
    ai_google_allowed_models json,
    collaborative_editing_enabled boolean DEFAULT false NOT NULL
);


ALTER TABLE public.directus_settings OWNER TO bayen_user;

--
-- Name: directus_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.directus_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directus_settings_id_seq OWNER TO bayen_user;

--
-- Name: directus_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.directus_settings_id_seq OWNED BY public.directus_settings.id;


--
-- Name: directus_shares; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_shares (
    id uuid NOT NULL,
    name character varying(255),
    collection character varying(64) NOT NULL,
    item character varying(255) NOT NULL,
    role uuid,
    password character varying(255),
    user_created uuid,
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_start timestamp with time zone,
    date_end timestamp with time zone,
    times_used integer DEFAULT 0,
    max_uses integer
);


ALTER TABLE public.directus_shares OWNER TO bayen_user;

--
-- Name: directus_translations; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_translations (
    id uuid NOT NULL,
    language character varying(255) NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.directus_translations OWNER TO bayen_user;

--
-- Name: directus_users; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_users (
    id uuid NOT NULL,
    first_name character varying(50),
    last_name character varying(50),
    email character varying(128),
    password character varying(255),
    location character varying(255),
    title character varying(50),
    description text,
    tags json,
    avatar uuid,
    language character varying(255) DEFAULT NULL::character varying,
    tfa_secret character varying(255),
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    role uuid,
    token character varying(255),
    last_access timestamp with time zone,
    last_page character varying(255),
    provider character varying(128) DEFAULT 'default'::character varying NOT NULL,
    external_identifier character varying(255),
    auth_data json,
    email_notifications boolean DEFAULT true,
    appearance character varying(255),
    theme_dark character varying(255),
    theme_light character varying(255),
    theme_light_overrides json,
    theme_dark_overrides json,
    text_direction character varying(255) DEFAULT 'auto'::character varying NOT NULL,
    display_name character varying(100),
    points integer DEFAULT 0 NOT NULL,
    contributions_count integer DEFAULT 0 NOT NULL,
    rank character varying(20) DEFAULT 'nouveau'::character varying NOT NULL
);


ALTER TABLE public.directus_users OWNER TO bayen_user;

--
-- Name: directus_versions; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.directus_versions (
    id uuid NOT NULL,
    key character varying(64) NOT NULL,
    name character varying(255),
    collection character varying(64) NOT NULL,
    item character varying(255) NOT NULL,
    hash character varying(255),
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_created uuid,
    user_updated uuid,
    delta json
);


ALTER TABLE public.directus_versions OWNER TO bayen_user;

--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.error_logs (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    source character varying(20) DEFAULT 'frontend'::character varying NOT NULL,
    severity character varying(10) DEFAULT 'error'::character varying NOT NULL,
    url text,
    user_agent text,
    message text,
    stack text,
    context jsonb
);


ALTER TABLE public.error_logs OWNER TO bayen_user;

--
-- Name: error_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.error_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.error_logs_id_seq OWNER TO bayen_user;

--
-- Name: error_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.error_logs_id_seq OWNED BY public.error_logs.id;


--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.ingredients (
    id integer NOT NULL,
    name_fr character varying(255) NOT NULL,
    name_ar character varying(255),
    category character varying(50) DEFAULT 'autre'::character varying,
    is_allergen boolean DEFAULT false,
    allergen_type character varying(50),
    icon character varying(10) DEFAULT '🔹'::character varying
);


ALTER TABLE public.ingredients OWNER TO bayen_user;

--
-- Name: ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ingredients_id_seq OWNER TO bayen_user;

--
-- Name: ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.ingredients_id_seq OWNED BY public.ingredients.id;


--
-- Name: meal_feedback; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.meal_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meal_scan_id uuid,
    user_id uuid,
    session_id character varying(64),
    plat_detecte character varying(255),
    rating character varying(8) NOT NULL,
    correction jsonb,
    confiance_ia character varying(10),
    date_created timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT meal_feedback_rating_check CHECK (((rating)::text = ANY ((ARRAY['up'::character varying, 'down'::character varying])::text[])))
);


ALTER TABLE public.meal_feedback OWNER TO bayen_user;

--
-- Name: meal_scans; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.meal_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    image uuid,
    plat character varying(200),
    description text,
    ingredients jsonb,
    nutrition jsonb,
    estimated_kcal integer,
    estimated_portion character varying(50),
    nova_group smallint,
    is_beverage boolean DEFAULT false,
    confidence numeric(3,2),
    meal_score integer,
    score_label character varying(20),
    raw_analysis jsonb,
    date_created timestamp with time zone DEFAULT now() NOT NULL,
    calories_min integer,
    calories_max integer,
    portion_g integer,
    proteines_g integer,
    glucides_g integer,
    lipides_g integer,
    confiance character varying(10),
    remarques text,
    verdict character varying(20),
    caracteristiques jsonb,
    conseil text,
    alternatives jsonb
);


ALTER TABLE public.meal_scans OWNER TO bayen_user;

--
-- Name: moroccan_dishes; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.moroccan_dishes (
    id integer NOT NULL,
    name_fr character varying(120) NOT NULL,
    name_ar character varying(120),
    aliases jsonb,
    portion_typique_g integer,
    kcal_min integer,
    kcal_max integer,
    proteines_g numeric(6,1),
    glucides_g numeric(6,1),
    lipides_g numeric(6,1),
    verdict_typique character varying(20),
    notes text,
    status character varying(12) DEFAULT 'published'::character varying NOT NULL
);


ALTER TABLE public.moroccan_dishes OWNER TO bayen_user;

--
-- Name: moroccan_dishes_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.moroccan_dishes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.moroccan_dishes_id_seq OWNER TO bayen_user;

--
-- Name: moroccan_dishes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.moroccan_dishes_id_seq OWNED BY public.moroccan_dishes.id;


--
-- Name: partner_requests; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.partner_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company character varying(120) NOT NULL,
    role character varying(40),
    name character varying(120) NOT NULL,
    email character varying(255) NOT NULL,
    message text,
    status character varying(12) DEFAULT 'new'::character varying NOT NULL,
    email_sent boolean DEFAULT false NOT NULL,
    date_created timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.partner_requests OWNER TO bayen_user;

--
-- Name: prices; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    price_mad numeric(8,2) NOT NULL,
    store character varying(60) NOT NULL,
    city character varying(60),
    user_id uuid,
    session_id character varying(64),
    status character varying(12) DEFAULT 'published'::character varying NOT NULL,
    date_created timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prices_price_mad_check CHECK (((price_mad >= 0.5) AND (price_mad <= (10000)::numeric)))
);


ALTER TABLE public.prices OWNER TO bayen_user;

--
-- Name: products; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.products (
    id uuid NOT NULL,
    barcode character varying(20) NOT NULL,
    name_fr character varying(255) NOT NULL,
    name_ar character varying(255),
    brand character varying(255) NOT NULL,
    category_id integer,
    image_front uuid,
    image_nutrition uuid,
    image_ingredients uuid,
    nutriscore_grade character varying(1),
    nova_group integer,
    scan_score integer,
    score_label character varying(20),
    energy_kcal real,
    fat_total real,
    fat_saturated real,
    carbs_total real,
    sugars real,
    fiber real,
    proteins real,
    salt real,
    ingredients_text text,
    additives json,
    allergens json,
    is_organic boolean DEFAULT false NOT NULL,
    is_halal boolean DEFAULT false NOT NULL,
    origin_country character varying(100),
    off_id character varying(255),
    data_source character varying(20) DEFAULT 'user'::character varying NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    confidence_score real DEFAULT '0'::real,
    ocr_raw_text text,
    ocr_confidence real,
    scan_count integer DEFAULT 0 NOT NULL,
    date_created timestamp with time zone NOT NULL,
    date_updated timestamp with time zone,
    created_by uuid,
    traces json,
    quantity character varying(100),
    ingredients_ocr_at timestamp with time zone,
    halal_source character varying(20),
    halal_confirmations integer DEFAULT 0 NOT NULL,
    halal_checked_at timestamp with time zone
);


ALTER TABLE public.products OWNER TO bayen_user;

--
-- Name: products_ingredients; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.products_ingredients (
    id integer NOT NULL,
    products_id uuid,
    ingredients_id integer,
    percent real,
    rank integer DEFAULT 0
);


ALTER TABLE public.products_ingredients OWNER TO bayen_user;

--
-- Name: products_ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: bayen_user
--

CREATE SEQUENCE public.products_ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_ingredients_id_seq OWNER TO bayen_user;

--
-- Name: products_ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bayen_user
--

ALTER SEQUENCE public.products_ingredients_id_seq OWNED BY public.products_ingredients.id;


--
-- Name: scans; Type: TABLE; Schema: public; Owner: bayen_user
--

CREATE TABLE public.scans (
    id uuid NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid,
    session_id character varying(64) NOT NULL,
    device_type character varying(50),
    date_created timestamp with time zone NOT NULL
);


ALTER TABLE public.scans OWNER TO bayen_user;

--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: directus_activity id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_activity ALTER COLUMN id SET DEFAULT nextval('public.directus_activity_id_seq'::regclass);


--
-- Name: directus_fields id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_fields ALTER COLUMN id SET DEFAULT nextval('public.directus_fields_id_seq'::regclass);


--
-- Name: directus_notifications id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_notifications ALTER COLUMN id SET DEFAULT nextval('public.directus_notifications_id_seq'::regclass);


--
-- Name: directus_permissions id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_permissions ALTER COLUMN id SET DEFAULT nextval('public.directus_permissions_id_seq'::regclass);


--
-- Name: directus_presets id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_presets ALTER COLUMN id SET DEFAULT nextval('public.directus_presets_id_seq'::regclass);


--
-- Name: directus_relations id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_relations ALTER COLUMN id SET DEFAULT nextval('public.directus_relations_id_seq'::regclass);


--
-- Name: directus_revisions id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_revisions ALTER COLUMN id SET DEFAULT nextval('public.directus_revisions_id_seq'::regclass);


--
-- Name: directus_settings id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_settings ALTER COLUMN id SET DEFAULT nextval('public.directus_settings_id_seq'::regclass);


--
-- Name: error_logs id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.error_logs ALTER COLUMN id SET DEFAULT nextval('public.error_logs_id_seq'::regclass);


--
-- Name: ingredients id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.ingredients ALTER COLUMN id SET DEFAULT nextval('public.ingredients_id_seq'::regclass);


--
-- Name: moroccan_dishes id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.moroccan_dishes ALTER COLUMN id SET DEFAULT nextval('public.moroccan_dishes_id_seq'::regclass);


--
-- Name: products_ingredients id; Type: DEFAULT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.products_ingredients ALTER COLUMN id SET DEFAULT nextval('public.products_ingredients_id_seq'::regclass);


--
-- Name: additives additives_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.additives
    ADD CONSTRAINT additives_pkey PRIMARY KEY (id);


--
-- Name: ai_logs ai_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.ai_logs
    ADD CONSTRAINT ai_logs_pkey PRIMARY KEY (id);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: articles articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_slug_key UNIQUE (slug);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_unique; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_unique UNIQUE (slug);


--
-- Name: contributions contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_pkey PRIMARY KEY (id);


--
-- Name: directus_access directus_access_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_access
    ADD CONSTRAINT directus_access_pkey PRIMARY KEY (id);


--
-- Name: directus_activity directus_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_activity
    ADD CONSTRAINT directus_activity_pkey PRIMARY KEY (id);


--
-- Name: directus_collections directus_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_collections
    ADD CONSTRAINT directus_collections_pkey PRIMARY KEY (collection);


--
-- Name: directus_comments directus_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_comments
    ADD CONSTRAINT directus_comments_pkey PRIMARY KEY (id);


--
-- Name: directus_dashboards directus_dashboards_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_dashboards
    ADD CONSTRAINT directus_dashboards_pkey PRIMARY KEY (id);


--
-- Name: directus_deployment_projects directus_deployment_projects_deployment_external_id_unique; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_deployment_projects
    ADD CONSTRAINT directus_deployment_projects_deployment_external_id_unique UNIQUE (deployment, external_id);


--
-- Name: directus_deployment_projects directus_deployment_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_deployment_projects
    ADD CONSTRAINT directus_deployment_projects_pkey PRIMARY KEY (id);


--
-- Name: directus_deployment_runs directus_deployment_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_deployment_runs
    ADD CONSTRAINT directus_deployment_runs_pkey PRIMARY KEY (id);


--
-- Name: directus_deployments directus_deployments_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_deployments
    ADD CONSTRAINT directus_deployments_pkey PRIMARY KEY (id);


--
-- Name: directus_deployments directus_deployments_provider_unique; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_deployments
    ADD CONSTRAINT directus_deployments_provider_unique UNIQUE (provider);


--
-- Name: directus_extensions directus_extensions_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_extensions
    ADD CONSTRAINT directus_extensions_pkey PRIMARY KEY (id);


--
-- Name: directus_fields directus_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_fields
    ADD CONSTRAINT directus_fields_pkey PRIMARY KEY (id);


--
-- Name: directus_files directus_files_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_files
    ADD CONSTRAINT directus_files_pkey PRIMARY KEY (id);


--
-- Name: directus_flows directus_flows_operation_unique; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_flows
    ADD CONSTRAINT directus_flows_operation_unique UNIQUE (operation);


--
-- Name: directus_flows directus_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_flows
    ADD CONSTRAINT directus_flows_pkey PRIMARY KEY (id);


--
-- Name: directus_folders directus_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_folders
    ADD CONSTRAINT directus_folders_pkey PRIMARY KEY (id);


--
-- Name: directus_migrations directus_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_migrations
    ADD CONSTRAINT directus_migrations_pkey PRIMARY KEY (version);


--
-- Name: directus_notifications directus_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_notifications
    ADD CONSTRAINT directus_notifications_pkey PRIMARY KEY (id);


--
-- Name: directus_operations directus_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_pkey PRIMARY KEY (id);


--
-- Name: directus_operations directus_operations_reject_unique; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_reject_unique UNIQUE (reject);


--
-- Name: directus_operations directus_operations_resolve_unique; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_resolve_unique UNIQUE (resolve);


--
-- Name: directus_panels directus_panels_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_panels
    ADD CONSTRAINT directus_panels_pkey PRIMARY KEY (id);


--
-- Name: directus_permissions directus_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_permissions
    ADD CONSTRAINT directus_permissions_pkey PRIMARY KEY (id);


--
-- Name: directus_policies directus_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_policies
    ADD CONSTRAINT directus_policies_pkey PRIMARY KEY (id);


--
-- Name: directus_presets directus_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_presets
    ADD CONSTRAINT directus_presets_pkey PRIMARY KEY (id);


--
-- Name: directus_relations directus_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_relations
    ADD CONSTRAINT directus_relations_pkey PRIMARY KEY (id);


--
-- Name: directus_revisions directus_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_revisions
    ADD CONSTRAINT directus_revisions_pkey PRIMARY KEY (id);


--
-- Name: directus_roles directus_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_roles
    ADD CONSTRAINT directus_roles_pkey PRIMARY KEY (id);


--
-- Name: directus_sessions directus_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_sessions
    ADD CONSTRAINT directus_sessions_pkey PRIMARY KEY (token);


--
-- Name: directus_settings directus_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_pkey PRIMARY KEY (id);


--
-- Name: directus_shares directus_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_shares
    ADD CONSTRAINT directus_shares_pkey PRIMARY KEY (id);


--
-- Name: directus_translations directus_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_translations
    ADD CONSTRAINT directus_translations_pkey PRIMARY KEY (id);


--
-- Name: directus_users directus_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_users
    ADD CONSTRAINT directus_users_email_unique UNIQUE (email);


--
-- Name: directus_users directus_users_external_identifier_unique; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_users
    ADD CONSTRAINT directus_users_external_identifier_unique UNIQUE (external_identifier);


--
-- Name: directus_users directus_users_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_users
    ADD CONSTRAINT directus_users_pkey PRIMARY KEY (id);


--
-- Name: directus_users directus_users_token_unique; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_users
    ADD CONSTRAINT directus_users_token_unique UNIQUE (token);


--
-- Name: directus_versions directus_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_versions
    ADD CONSTRAINT directus_versions_pkey PRIMARY KEY (id);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: ingredients ingredients_name_fr_key; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_name_fr_key UNIQUE (name_fr);


--
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- Name: meal_feedback meal_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.meal_feedback
    ADD CONSTRAINT meal_feedback_pkey PRIMARY KEY (id);


--
-- Name: meal_scans meal_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.meal_scans
    ADD CONSTRAINT meal_scans_pkey PRIMARY KEY (id);


--
-- Name: moroccan_dishes moroccan_dishes_name_fr_key; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.moroccan_dishes
    ADD CONSTRAINT moroccan_dishes_name_fr_key UNIQUE (name_fr);


--
-- Name: moroccan_dishes moroccan_dishes_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.moroccan_dishes
    ADD CONSTRAINT moroccan_dishes_pkey PRIMARY KEY (id);


--
-- Name: partner_requests partner_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.partner_requests
    ADD CONSTRAINT partner_requests_pkey PRIMARY KEY (id);


--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);


--
-- Name: products products_barcode_unique; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_barcode_unique UNIQUE (barcode);


--
-- Name: products_ingredients products_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.products_ingredients
    ADD CONSTRAINT products_ingredients_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: scans scans_pkey; Type: CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.scans
    ADD CONSTRAINT scans_pkey PRIMARY KEY (id);


--
-- Name: articles_category_idx; Type: INDEX; Schema: public; Owner: bayen_user
--

CREATE INDEX articles_category_idx ON public.articles USING btree (category);


--
-- Name: articles_published_idx; Type: INDEX; Schema: public; Owner: bayen_user
--

CREATE INDEX articles_published_idx ON public.articles USING btree (status, date_published DESC);


--
-- Name: articles_slug_idx; Type: INDEX; Schema: public; Owner: bayen_user
--

CREATE INDEX articles_slug_idx ON public.articles USING btree (slug);


--
-- Name: error_logs_timestamp_idx; Type: INDEX; Schema: public; Owner: bayen_user
--

CREATE INDEX error_logs_timestamp_idx ON public.error_logs USING btree ("timestamp" DESC);


--
-- Name: idx_pi_ingredient; Type: INDEX; Schema: public; Owner: bayen_user
--

CREATE INDEX idx_pi_ingredient ON public.products_ingredients USING btree (ingredients_id);


--
-- Name: idx_pi_product; Type: INDEX; Schema: public; Owner: bayen_user
--

CREATE INDEX idx_pi_product ON public.products_ingredients USING btree (products_id);


--
-- Name: meal_feedback_plat_idx; Type: INDEX; Schema: public; Owner: bayen_user
--

CREATE INDEX meal_feedback_plat_idx ON public.meal_feedback USING btree (plat_detecte, date_created DESC);


--
-- Name: meal_scans_user_date_idx; Type: INDEX; Schema: public; Owner: bayen_user
--

CREATE INDEX meal_scans_user_date_idx ON public.meal_scans USING btree (user_id, date_created DESC);


--
-- Name: prices_product_date_idx; Type: INDEX; Schema: public; Owner: bayen_user
--

CREATE INDEX prices_product_date_idx ON public.prices USING btree (product_id, date_created DESC);


--
-- Name: ai_logs ai_logs_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.ai_logs
    ADD CONSTRAINT ai_logs_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: articles articles_cover_image_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_cover_image_foreign FOREIGN KEY (cover_image) REFERENCES public.directus_files(id) ON DELETE SET NULL;


--
-- Name: articles articles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: categories categories_parent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_foreign FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: contributions contributions_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: contributions contributions_reviewed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_reviewed_by_foreign FOREIGN KEY (reviewed_by) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: contributions contributions_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.directus_users(id) ON DELETE CASCADE;


--
-- Name: directus_access directus_access_policy_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_access
    ADD CONSTRAINT directus_access_policy_foreign FOREIGN KEY (policy) REFERENCES public.directus_policies(id) ON DELETE CASCADE;


--
-- Name: directus_access directus_access_role_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_access
    ADD CONSTRAINT directus_access_role_foreign FOREIGN KEY (role) REFERENCES public.directus_roles(id) ON DELETE CASCADE;


--
-- Name: directus_access directus_access_user_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_access
    ADD CONSTRAINT directus_access_user_foreign FOREIGN KEY ("user") REFERENCES public.directus_users(id) ON DELETE CASCADE;


--
-- Name: directus_collections directus_collections_group_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_collections
    ADD CONSTRAINT directus_collections_group_foreign FOREIGN KEY ("group") REFERENCES public.directus_collections(collection);


--
-- Name: directus_comments directus_comments_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_comments
    ADD CONSTRAINT directus_comments_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_comments directus_comments_user_updated_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_comments
    ADD CONSTRAINT directus_comments_user_updated_foreign FOREIGN KEY (user_updated) REFERENCES public.directus_users(id);


--
-- Name: directus_dashboards directus_dashboards_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_dashboards
    ADD CONSTRAINT directus_dashboards_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_deployment_projects directus_deployment_projects_deployment_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_deployment_projects
    ADD CONSTRAINT directus_deployment_projects_deployment_foreign FOREIGN KEY (deployment) REFERENCES public.directus_deployments(id) ON DELETE CASCADE;


--
-- Name: directus_deployment_projects directus_deployment_projects_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_deployment_projects
    ADD CONSTRAINT directus_deployment_projects_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_deployment_runs directus_deployment_runs_project_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_deployment_runs
    ADD CONSTRAINT directus_deployment_runs_project_foreign FOREIGN KEY (project) REFERENCES public.directus_deployment_projects(id) ON DELETE CASCADE;


--
-- Name: directus_deployment_runs directus_deployment_runs_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_deployment_runs
    ADD CONSTRAINT directus_deployment_runs_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_deployments directus_deployments_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_deployments
    ADD CONSTRAINT directus_deployments_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_files directus_files_folder_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_files
    ADD CONSTRAINT directus_files_folder_foreign FOREIGN KEY (folder) REFERENCES public.directus_folders(id) ON DELETE SET NULL;


--
-- Name: directus_files directus_files_modified_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_files
    ADD CONSTRAINT directus_files_modified_by_foreign FOREIGN KEY (modified_by) REFERENCES public.directus_users(id);


--
-- Name: directus_files directus_files_uploaded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_files
    ADD CONSTRAINT directus_files_uploaded_by_foreign FOREIGN KEY (uploaded_by) REFERENCES public.directus_users(id);


--
-- Name: directus_flows directus_flows_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_flows
    ADD CONSTRAINT directus_flows_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_folders directus_folders_parent_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_folders
    ADD CONSTRAINT directus_folders_parent_foreign FOREIGN KEY (parent) REFERENCES public.directus_folders(id);


--
-- Name: directus_notifications directus_notifications_recipient_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_notifications
    ADD CONSTRAINT directus_notifications_recipient_foreign FOREIGN KEY (recipient) REFERENCES public.directus_users(id) ON DELETE CASCADE;


--
-- Name: directus_notifications directus_notifications_sender_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_notifications
    ADD CONSTRAINT directus_notifications_sender_foreign FOREIGN KEY (sender) REFERENCES public.directus_users(id);


--
-- Name: directus_operations directus_operations_flow_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_flow_foreign FOREIGN KEY (flow) REFERENCES public.directus_flows(id) ON DELETE CASCADE;


--
-- Name: directus_operations directus_operations_reject_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_reject_foreign FOREIGN KEY (reject) REFERENCES public.directus_operations(id);


--
-- Name: directus_operations directus_operations_resolve_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_resolve_foreign FOREIGN KEY (resolve) REFERENCES public.directus_operations(id);


--
-- Name: directus_operations directus_operations_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_operations
    ADD CONSTRAINT directus_operations_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_panels directus_panels_dashboard_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_panels
    ADD CONSTRAINT directus_panels_dashboard_foreign FOREIGN KEY (dashboard) REFERENCES public.directus_dashboards(id) ON DELETE CASCADE;


--
-- Name: directus_panels directus_panels_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_panels
    ADD CONSTRAINT directus_panels_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_permissions directus_permissions_policy_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_permissions
    ADD CONSTRAINT directus_permissions_policy_foreign FOREIGN KEY (policy) REFERENCES public.directus_policies(id) ON DELETE CASCADE;


--
-- Name: directus_presets directus_presets_role_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_presets
    ADD CONSTRAINT directus_presets_role_foreign FOREIGN KEY (role) REFERENCES public.directus_roles(id) ON DELETE CASCADE;


--
-- Name: directus_presets directus_presets_user_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_presets
    ADD CONSTRAINT directus_presets_user_foreign FOREIGN KEY ("user") REFERENCES public.directus_users(id) ON DELETE CASCADE;


--
-- Name: directus_revisions directus_revisions_activity_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_revisions
    ADD CONSTRAINT directus_revisions_activity_foreign FOREIGN KEY (activity) REFERENCES public.directus_activity(id) ON DELETE CASCADE;


--
-- Name: directus_revisions directus_revisions_parent_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_revisions
    ADD CONSTRAINT directus_revisions_parent_foreign FOREIGN KEY (parent) REFERENCES public.directus_revisions(id);


--
-- Name: directus_revisions directus_revisions_version_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_revisions
    ADD CONSTRAINT directus_revisions_version_foreign FOREIGN KEY (version) REFERENCES public.directus_versions(id) ON DELETE CASCADE;


--
-- Name: directus_roles directus_roles_parent_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_roles
    ADD CONSTRAINT directus_roles_parent_foreign FOREIGN KEY (parent) REFERENCES public.directus_roles(id);


--
-- Name: directus_sessions directus_sessions_share_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_sessions
    ADD CONSTRAINT directus_sessions_share_foreign FOREIGN KEY (share) REFERENCES public.directus_shares(id) ON DELETE CASCADE;


--
-- Name: directus_sessions directus_sessions_user_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_sessions
    ADD CONSTRAINT directus_sessions_user_foreign FOREIGN KEY ("user") REFERENCES public.directus_users(id) ON DELETE CASCADE;


--
-- Name: directus_settings directus_settings_project_logo_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_project_logo_foreign FOREIGN KEY (project_logo) REFERENCES public.directus_files(id);


--
-- Name: directus_settings directus_settings_public_background_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_public_background_foreign FOREIGN KEY (public_background) REFERENCES public.directus_files(id);


--
-- Name: directus_settings directus_settings_public_favicon_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_public_favicon_foreign FOREIGN KEY (public_favicon) REFERENCES public.directus_files(id);


--
-- Name: directus_settings directus_settings_public_foreground_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_public_foreground_foreign FOREIGN KEY (public_foreground) REFERENCES public.directus_files(id);


--
-- Name: directus_settings directus_settings_public_registration_role_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_public_registration_role_foreign FOREIGN KEY (public_registration_role) REFERENCES public.directus_roles(id) ON DELETE SET NULL;


--
-- Name: directus_settings directus_settings_storage_default_folder_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_settings
    ADD CONSTRAINT directus_settings_storage_default_folder_foreign FOREIGN KEY (storage_default_folder) REFERENCES public.directus_folders(id) ON DELETE SET NULL;


--
-- Name: directus_shares directus_shares_collection_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_shares
    ADD CONSTRAINT directus_shares_collection_foreign FOREIGN KEY (collection) REFERENCES public.directus_collections(collection) ON DELETE CASCADE;


--
-- Name: directus_shares directus_shares_role_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_shares
    ADD CONSTRAINT directus_shares_role_foreign FOREIGN KEY (role) REFERENCES public.directus_roles(id) ON DELETE CASCADE;


--
-- Name: directus_shares directus_shares_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_shares
    ADD CONSTRAINT directus_shares_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_users directus_users_role_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_users
    ADD CONSTRAINT directus_users_role_foreign FOREIGN KEY (role) REFERENCES public.directus_roles(id) ON DELETE SET NULL;


--
-- Name: directus_versions directus_versions_collection_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_versions
    ADD CONSTRAINT directus_versions_collection_foreign FOREIGN KEY (collection) REFERENCES public.directus_collections(collection) ON DELETE CASCADE;


--
-- Name: directus_versions directus_versions_user_created_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_versions
    ADD CONSTRAINT directus_versions_user_created_foreign FOREIGN KEY (user_created) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: directus_versions directus_versions_user_updated_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.directus_versions
    ADD CONSTRAINT directus_versions_user_updated_foreign FOREIGN KEY (user_updated) REFERENCES public.directus_users(id);


--
-- Name: meal_feedback meal_feedback_meal_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.meal_feedback
    ADD CONSTRAINT meal_feedback_meal_scan_id_fkey FOREIGN KEY (meal_scan_id) REFERENCES public.meal_scans(id) ON DELETE SET NULL;


--
-- Name: meal_feedback meal_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.meal_feedback
    ADD CONSTRAINT meal_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: meal_scans meal_scans_image_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.meal_scans
    ADD CONSTRAINT meal_scans_image_fkey FOREIGN KEY (image) REFERENCES public.directus_files(id) ON DELETE SET NULL;


--
-- Name: meal_scans meal_scans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.meal_scans
    ADD CONSTRAINT meal_scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.directus_users(id) ON DELETE CASCADE;


--
-- Name: prices prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: prices prices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_foreign FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- Name: products_ingredients products_ingredients_ingredients_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.products_ingredients
    ADD CONSTRAINT products_ingredients_ingredients_id_fkey FOREIGN KEY (ingredients_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- Name: products_ingredients products_ingredients_products_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.products_ingredients
    ADD CONSTRAINT products_ingredients_products_id_fkey FOREIGN KEY (products_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: scans scans_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.scans
    ADD CONSTRAINT scans_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: scans scans_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: bayen_user
--

ALTER TABLE ONLY public.scans
    ADD CONSTRAINT scans_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.directus_users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict j3cALOqh3DmxjPpXXFDnmrfGY5G7UaU3aG7D5VHCVbLSpD0eDNjKcaNUuIP3CUR

