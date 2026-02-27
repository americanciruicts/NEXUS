--
-- PostgreSQL database dump
--

\restrict NaZWHfZaPdkDkR7YL9cwc0jc6TGGe9LCLnc88HYfRnqKMQWtCkVoVOsYCV6QPsq

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 17.7 (Debian 17.7-0+deb13u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: approvalstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approvalstatus AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: notificationtype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notificationtype AS ENUM (
    'TRAVELER_CREATED',
    'TRAVELER_UPDATED',
    'TRAVELER_DELETED',
    'LABOR_ENTRY_CREATED',
    'LABOR_ENTRY_UPDATED',
    'LABOR_ENTRY_DELETED',
    'TRACKING_ENTRY_CREATED',
    'TRACKING_ENTRY_UPDATED',
    'TRACKING_ENTRY_DELETED'
);


--
-- Name: priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.priority AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


--
-- Name: travelerstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.travelerstatus AS ENUM (
    'DRAFT',
    'CREATED',
    'IN_PROGRESS',
    'COMPLETED',
    'ON_HOLD',
    'CANCELLED',
    'ARCHIVED'
);


--
-- Name: travelertype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.travelertype AS ENUM (
    'PCB',
    'ASSY',
    'CABLE',
    'CABLE_ASSY',
    'MECHANICAL',
    'TEST'
);


--
-- Name: userrole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.userrole AS ENUM (
    'ADMIN',
    'OPERATOR'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approvals (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    requested_by integer NOT NULL,
    requested_at timestamp with time zone DEFAULT now(),
    status public.approvalstatus,
    approved_by integer,
    approved_at timestamp with time zone,
    rejected_by integer,
    rejected_at timestamp with time zone,
    rejection_reason text,
    request_type character varying(20) NOT NULL,
    request_details text NOT NULL
);


--
-- Name: approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approvals_id_seq OWNED BY public.approvals.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(20) NOT NULL,
    field_changed character varying(50),
    old_value text,
    new_value text,
    "timestamp" timestamp with time zone DEFAULT now(),
    ip_address character varying(45),
    user_agent character varying(500)
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: labor_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labor_entries (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_id integer,
    work_center character varying(100),
    sequence_number integer,
    employee_id integer NOT NULL,
    start_time timestamp with time zone NOT NULL,
    pause_time timestamp with time zone,
    end_time timestamp with time zone,
    hours_worked double precision,
    description text,
    is_completed boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: labor_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.labor_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: labor_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labor_entries_id_seq OWNED BY public.labor_entries.id;


--
-- Name: manual_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manual_steps (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    description text NOT NULL,
    added_by integer NOT NULL,
    added_at timestamp with time zone DEFAULT now()
);


--
-- Name: manual_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manual_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manual_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manual_steps_id_seq OWNED BY public.manual_steps.id;


--
-- Name: nexus_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_approvals (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    requested_by integer NOT NULL,
    requested_at timestamp with time zone DEFAULT now(),
    status public.approvalstatus,
    approved_by integer,
    approved_at timestamp with time zone,
    rejected_by integer,
    rejected_at timestamp with time zone,
    rejection_reason text,
    request_type character varying(20) NOT NULL,
    request_details text NOT NULL
);


--
-- Name: nexus_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_approvals_id_seq OWNED BY public.nexus_approvals.id;


--
-- Name: nexus_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_audit_logs (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(20) NOT NULL,
    field_changed character varying(50),
    old_value text,
    new_value text,
    "timestamp" timestamp with time zone DEFAULT now(),
    ip_address character varying(45),
    user_agent character varying(500)
);


--
-- Name: nexus_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_audit_logs_id_seq OWNED BY public.nexus_audit_logs.id;


--
-- Name: nexus_labor_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_labor_entries (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_id integer,
    work_center character varying(100),
    sequence_number integer,
    employee_id integer NOT NULL,
    start_time timestamp with time zone NOT NULL,
    pause_time timestamp with time zone,
    end_time timestamp with time zone,
    hours_worked double precision,
    description text,
    is_completed boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_labor_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_labor_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_labor_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_labor_entries_id_seq OWNED BY public.nexus_labor_entries.id;


--
-- Name: nexus_manual_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_manual_steps (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    description text NOT NULL,
    added_by integer NOT NULL,
    added_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_manual_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_manual_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_manual_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_manual_steps_id_seq OWNED BY public.nexus_manual_steps.id;


--
-- Name: nexus_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    notification_type public.notificationtype NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    reference_id integer,
    reference_type character varying(50),
    created_by_username character varying(100),
    is_read boolean,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


--
-- Name: nexus_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_notifications_id_seq OWNED BY public.nexus_notifications.id;


--
-- Name: nexus_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_parts (
    id integer NOT NULL,
    part_number character varying(50) NOT NULL,
    description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    work_center_code character varying(20) NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_parts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_parts_id_seq OWNED BY public.nexus_parts.id;


--
-- Name: nexus_process_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_process_steps (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_number integer NOT NULL,
    operation character varying(100) NOT NULL,
    work_center_code character varying(20) NOT NULL,
    instructions text NOT NULL,
    quantity integer,
    accepted integer,
    rejected integer,
    sign character varying(50),
    completed_date character varying(20),
    estimated_time integer,
    is_required boolean,
    is_completed boolean,
    completed_by integer,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_process_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_process_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_process_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_process_steps_id_seq OWNED BY public.nexus_process_steps.id;


--
-- Name: nexus_step_scan_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_step_scan_events (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_id integer NOT NULL,
    step_type character varying(20) NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100) NOT NULL,
    scan_action character varying(20) NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    scanned_by integer,
    notes text,
    duration_minutes double precision
);


--
-- Name: nexus_step_scan_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_step_scan_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_step_scan_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_step_scan_events_id_seq OWNED BY public.nexus_step_scan_events.id;


--
-- Name: nexus_sub_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_sub_steps (
    id integer NOT NULL,
    process_step_id integer NOT NULL,
    step_number character varying(10) NOT NULL,
    description text NOT NULL,
    is_completed boolean,
    completed_by integer,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_sub_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_sub_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_sub_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_sub_steps_id_seq OWNED BY public.nexus_sub_steps.id;


--
-- Name: nexus_traveler_time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_traveler_time_entries (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100) NOT NULL,
    operator_name character varying(100) NOT NULL,
    start_time timestamp with time zone NOT NULL,
    pause_time timestamp with time zone,
    end_time timestamp with time zone,
    hours_worked double precision,
    pause_duration double precision,
    is_completed boolean,
    created_by integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_traveler_time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_traveler_time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_traveler_time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_traveler_time_entries_id_seq OWNED BY public.nexus_traveler_time_entries.id;


--
-- Name: nexus_traveler_tracking_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_traveler_tracking_logs (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100),
    step_sequence integer,
    scan_type character varying(20) NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    scanned_by character varying(100),
    notes text
);


--
-- Name: nexus_traveler_tracking_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_traveler_tracking_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_traveler_tracking_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_traveler_tracking_logs_id_seq OWNED BY public.nexus_traveler_tracking_logs.id;


--
-- Name: nexus_travelers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_travelers (
    id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_order_number character varying(50),
    po_number character varying(255),
    traveler_type public.travelertype NOT NULL,
    part_number character varying(50) NOT NULL,
    part_description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    quantity integer NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    priority public.priority,
    work_center character varying(20) NOT NULL,
    status public.travelerstatus,
    is_active boolean,
    notes text,
    specs text,
    specs_date character varying(20),
    from_stock character varying(100),
    to_stock character varying(100),
    ship_via character varying(100),
    comments text,
    due_date character varying(20),
    ship_date character varying(20),
    include_labor_hours boolean,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    completed_at timestamp with time zone,
    part_id integer
);


--
-- Name: nexus_travelers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_travelers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_travelers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_travelers_id_seq OWNED BY public.nexus_travelers.id;


--
-- Name: nexus_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    role public.userrole NOT NULL,
    is_approver boolean,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


--
-- Name: nexus_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_users_id_seq OWNED BY public.nexus_users.id;


--
-- Name: nexus_work_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_work_centers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_work_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_work_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_work_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_work_centers_id_seq OWNED BY public.nexus_work_centers.id;


--
-- Name: nexus_work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_work_orders (
    id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_order_number character varying(50) NOT NULL,
    part_number character varying(50) NOT NULL,
    part_description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    quantity integer NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    work_center character varying(20) NOT NULL,
    priority public.priority,
    process_template text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_work_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_work_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_work_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_work_orders_id_seq OWNED BY public.nexus_work_orders.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    notification_type public.notificationtype NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    reference_id integer,
    reference_type character varying(50),
    created_by_username character varying(100),
    is_read boolean,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parts (
    id integer NOT NULL,
    part_number character varying(50) NOT NULL,
    description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    work_center_code character varying(20) NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: parts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parts_id_seq OWNED BY public.parts.id;


--
-- Name: process_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_steps (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_number integer NOT NULL,
    operation character varying(100) NOT NULL,
    work_center_code character varying(20) NOT NULL,
    instructions text NOT NULL,
    quantity integer,
    accepted integer,
    rejected integer,
    sign character varying(50),
    completed_date character varying(20),
    estimated_time integer,
    is_required boolean,
    is_completed boolean,
    completed_by integer,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: process_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.process_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: process_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.process_steps_id_seq OWNED BY public.process_steps.id;


--
-- Name: step_scan_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.step_scan_events (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_id integer NOT NULL,
    step_type character varying(20) NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100) NOT NULL,
    scan_action character varying(20) NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    scanned_by integer,
    notes text,
    duration_minutes double precision
);


--
-- Name: step_scan_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.step_scan_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: step_scan_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.step_scan_events_id_seq OWNED BY public.step_scan_events.id;


--
-- Name: sub_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_steps (
    id integer NOT NULL,
    process_step_id integer NOT NULL,
    step_number character varying(10) NOT NULL,
    description text NOT NULL,
    is_completed boolean,
    completed_by integer,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sub_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sub_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sub_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sub_steps_id_seq OWNED BY public.sub_steps.id;


--
-- Name: traveler_time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.traveler_time_entries (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100) NOT NULL,
    operator_name character varying(100) NOT NULL,
    start_time timestamp with time zone NOT NULL,
    pause_time timestamp with time zone,
    end_time timestamp with time zone,
    hours_worked double precision,
    pause_duration double precision,
    is_completed boolean,
    created_by integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: traveler_time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.traveler_time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: traveler_time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.traveler_time_entries_id_seq OWNED BY public.traveler_time_entries.id;


--
-- Name: traveler_tracking_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.traveler_tracking_logs (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100),
    step_sequence integer,
    scan_type character varying(20) NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    scanned_by character varying(100),
    notes text
);


--
-- Name: traveler_tracking_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.traveler_tracking_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: traveler_tracking_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.traveler_tracking_logs_id_seq OWNED BY public.traveler_tracking_logs.id;


--
-- Name: travelers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travelers (
    id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_order_number character varying(50),
    po_number character varying(255),
    traveler_type public.travelertype NOT NULL,
    part_number character varying(50) NOT NULL,
    part_description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    quantity integer NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    priority public.priority,
    work_center character varying(20) NOT NULL,
    status public.travelerstatus,
    is_active boolean,
    notes text,
    specs text,
    specs_date character varying(20),
    from_stock character varying(100),
    to_stock character varying(100),
    ship_via character varying(100),
    comments text,
    due_date character varying(20),
    ship_date character varying(20),
    include_labor_hours boolean,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    completed_at timestamp with time zone,
    part_id integer
);


--
-- Name: travelers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.travelers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: travelers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.travelers_id_seq OWNED BY public.travelers.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    role public.userrole NOT NULL,
    is_approver boolean,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: work_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_centers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: work_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_centers_id_seq OWNED BY public.work_centers.id;


--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_orders (
    id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_order_number character varying(50) NOT NULL,
    part_number character varying(50) NOT NULL,
    part_description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    quantity integer NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    work_center character varying(20) NOT NULL,
    priority public.priority,
    process_template text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: work_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_orders_id_seq OWNED BY public.work_orders.id;


--
-- Name: approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals ALTER COLUMN id SET DEFAULT nextval('public.approvals_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: labor_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries ALTER COLUMN id SET DEFAULT nextval('public.labor_entries_id_seq'::regclass);


--
-- Name: manual_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_steps ALTER COLUMN id SET DEFAULT nextval('public.manual_steps_id_seq'::regclass);


--
-- Name: nexus_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals ALTER COLUMN id SET DEFAULT nextval('public.nexus_approvals_id_seq'::regclass);


--
-- Name: nexus_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.nexus_audit_logs_id_seq'::regclass);


--
-- Name: nexus_labor_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_labor_entries ALTER COLUMN id SET DEFAULT nextval('public.nexus_labor_entries_id_seq'::regclass);


--
-- Name: nexus_manual_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_manual_steps ALTER COLUMN id SET DEFAULT nextval('public.nexus_manual_steps_id_seq'::regclass);


--
-- Name: nexus_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_notifications ALTER COLUMN id SET DEFAULT nextval('public.nexus_notifications_id_seq'::regclass);


--
-- Name: nexus_parts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_parts ALTER COLUMN id SET DEFAULT nextval('public.nexus_parts_id_seq'::regclass);


--
-- Name: nexus_process_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_process_steps ALTER COLUMN id SET DEFAULT nextval('public.nexus_process_steps_id_seq'::regclass);


--
-- Name: nexus_step_scan_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_step_scan_events ALTER COLUMN id SET DEFAULT nextval('public.nexus_step_scan_events_id_seq'::regclass);


--
-- Name: nexus_sub_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_sub_steps ALTER COLUMN id SET DEFAULT nextval('public.nexus_sub_steps_id_seq'::regclass);


--
-- Name: nexus_traveler_time_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_time_entries ALTER COLUMN id SET DEFAULT nextval('public.nexus_traveler_time_entries_id_seq'::regclass);


--
-- Name: nexus_traveler_tracking_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_tracking_logs ALTER COLUMN id SET DEFAULT nextval('public.nexus_traveler_tracking_logs_id_seq'::regclass);


--
-- Name: nexus_travelers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_travelers ALTER COLUMN id SET DEFAULT nextval('public.nexus_travelers_id_seq'::regclass);


--
-- Name: nexus_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_users ALTER COLUMN id SET DEFAULT nextval('public.nexus_users_id_seq'::regclass);


--
-- Name: nexus_work_centers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_work_centers ALTER COLUMN id SET DEFAULT nextval('public.nexus_work_centers_id_seq'::regclass);


--
-- Name: nexus_work_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_work_orders ALTER COLUMN id SET DEFAULT nextval('public.nexus_work_orders_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: parts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parts ALTER COLUMN id SET DEFAULT nextval('public.parts_id_seq'::regclass);


--
-- Name: process_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps ALTER COLUMN id SET DEFAULT nextval('public.process_steps_id_seq'::regclass);


--
-- Name: step_scan_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_scan_events ALTER COLUMN id SET DEFAULT nextval('public.step_scan_events_id_seq'::regclass);


--
-- Name: sub_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_steps ALTER COLUMN id SET DEFAULT nextval('public.sub_steps_id_seq'::regclass);


--
-- Name: traveler_time_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_time_entries ALTER COLUMN id SET DEFAULT nextval('public.traveler_time_entries_id_seq'::regclass);


--
-- Name: traveler_tracking_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_tracking_logs ALTER COLUMN id SET DEFAULT nextval('public.traveler_tracking_logs_id_seq'::regclass);


--
-- Name: travelers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travelers ALTER COLUMN id SET DEFAULT nextval('public.travelers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: work_centers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers ALTER COLUMN id SET DEFAULT nextval('public.work_centers_id_seq'::regclass);


--
-- Name: work_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders ALTER COLUMN id SET DEFAULT nextval('public.work_orders_id_seq'::regclass);


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.approvals (id, traveler_id, requested_by, requested_at, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, request_type, request_details) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, traveler_id, user_id, action, field_changed, old_value, new_value, "timestamp", ip_address, user_agent) FROM stdin;
1	14	4	CREATED	\N	\N	\N	2026-01-15 16:51:19.375651+00	127.0.0.1	NEXUS-Frontend
\.


--
-- Data for Name: labor_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.labor_entries (id, traveler_id, step_id, work_center, sequence_number, employee_id, start_time, pause_time, end_time, hours_worked, description, is_completed, created_at) FROM stdin;
\.


--
-- Data for Name: manual_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manual_steps (id, traveler_id, description, added_by, added_at) FROM stdin;
\.


--
-- Data for Name: nexus_approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_approvals (id, traveler_id, requested_by, requested_at, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, request_type, request_details) FROM stdin;
\.


--
-- Data for Name: nexus_audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_audit_logs (id, traveler_id, user_id, action, field_changed, old_value, new_value, "timestamp", ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: nexus_labor_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_labor_entries (id, traveler_id, step_id, work_center, sequence_number, employee_id, start_time, pause_time, end_time, hours_worked, description, is_completed, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_manual_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_manual_steps (id, traveler_id, description, added_by, added_at) FROM stdin;
\.


--
-- Data for Name: nexus_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_notifications (id, user_id, notification_type, title, message, reference_id, reference_type, created_by_username, is_read, created_at, read_at) FROM stdin;
\.


--
-- Data for Name: nexus_parts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_parts (id, part_number, description, revision, work_center_code, customer_code, customer_name, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_process_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_process_steps (id, traveler_id, step_number, operation, work_center_code, instructions, quantity, accepted, rejected, sign, completed_date, estimated_time, is_required, is_completed, completed_by, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_step_scan_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_step_scan_events (id, traveler_id, step_id, step_type, job_number, work_center, scan_action, scanned_at, scanned_by, notes, duration_minutes) FROM stdin;
\.


--
-- Data for Name: nexus_sub_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_sub_steps (id, process_step_id, step_number, description, is_completed, completed_by, completed_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_traveler_time_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_traveler_time_entries (id, traveler_id, job_number, work_center, operator_name, start_time, pause_time, end_time, hours_worked, pause_duration, is_completed, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_traveler_tracking_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_traveler_tracking_logs (id, traveler_id, job_number, work_center, step_sequence, scan_type, scanned_at, scanned_by, notes) FROM stdin;
\.


--
-- Data for Name: nexus_travelers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_travelers (id, job_number, work_order_number, po_number, traveler_type, part_number, part_description, revision, quantity, customer_code, customer_name, priority, work_center, status, is_active, notes, specs, specs_date, from_stock, to_stock, ship_via, comments, due_date, ship_date, include_labor_hours, created_by, created_at, updated_at, completed_at, part_id) FROM stdin;
\.


--
-- Data for Name: nexus_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_users (id, username, email, first_name, last_name, hashed_password, role, is_approver, is_active, created_at, updated_at) FROM stdin;
1	adam	adam@nexus.local	Adam		$2b$12$sAtLrWth2UZ7m0EPWlEArOPfCtpfHGrSeYxxjPwrHDnyPi6A/ez.i	ADMIN	t	t	2026-01-13 13:14:22.260051+00	\N
2	kris	kris@nexus.local	Kris		$2b$12$ichlTN8LXJzfB/gwIIaHhuxb9gMxIdY4Q9kkQYcjtSt9vWbTgTOti	ADMIN	t	t	2026-01-13 13:14:22.260051+00	\N
3	alex	alex@nexus.local	Alex		$2b$12$pCl.REJPBjwdibAL5CBe/OaOdxPS31JzkJcirt71QpBL6bk7ThlZq	ADMIN	t	t	2026-01-13 13:14:22.260051+00	\N
4	preet	preet@nexus.local	Preet		$2b$12$6W1x1UPVM7T8XFShP/9kHe5NgzqWaUIsVbnKmla5V/y2LsBbQCtg6	ADMIN	t	t	2026-01-13 13:14:22.260051+00	\N
5	kanav	kanav@nexus.local	Kanav		$2b$12$WH8xCU277jAUsz1PvBRZ7u/YpEyIUTPjMbQF4h9Mkm6M3ITnEfSHW	ADMIN	t	t	2026-01-13 13:14:22.260051+00	\N
\.


--
-- Data for Name: nexus_work_centers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_work_centers (id, name, code, description, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_work_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_work_orders (id, job_number, work_order_number, part_number, part_description, revision, quantity, customer_code, customer_name, work_center, priority, process_template, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, notification_type, title, message, reference_id, reference_type, created_by_username, is_read, created_at, read_at) FROM stdin;
1	1	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
2	2	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
3	3	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
5	5	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
6	6	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
7	7	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
8	1	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
9	2	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
10	3	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
12	5	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
13	6	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
14	7	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
15	1	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
16	2	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
17	3	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
19	5	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
20	6	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
21	7	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
22	1	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
23	2	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
24	3	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
26	5	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
27	6	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
28	7	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
29	1	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
30	2	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
31	3	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
32	4	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
33	5	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
34	6	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
35	7	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
\.


--
-- Data for Name: parts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parts (id, part_number, description, revision, work_center_code, customer_code, customer_name, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: process_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.process_steps (id, traveler_id, step_number, operation, work_center_code, instructions, quantity, accepted, rejected, sign, completed_date, estimated_time, is_required, is_completed, completed_by, completed_at, created_at) FROM stdin;
1	14	1	ENGINEERING	ENGINEERING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 16:51:19.495494+00
2	14	2	INVENTORY	INVENTORY		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 16:51:19.524036+00
3	14	3	PURCHASING	PURCHASING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 16:51:19.538403+00
4	14	4	PURCHASING	PURCHASING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 16:51:19.545255+00
5	14	5	PURCHASING	PURCHASING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 16:51:19.555827+00
6	14	6	PURCHASING	PURCHASING		19	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 16:51:19.56593+00
7	14	7	PURCHASING	PURCHASING		19	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 16:51:19.572541+00
8	14	8	PURCHASING	PURCHASING		19	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 16:51:19.578631+00
\.


--
-- Data for Name: step_scan_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.step_scan_events (id, traveler_id, step_id, step_type, job_number, work_center, scan_action, scanned_at, scanned_by, notes, duration_minutes) FROM stdin;
\.


--
-- Data for Name: sub_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sub_steps (id, process_step_id, step_number, description, is_completed, completed_by, completed_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: traveler_time_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.traveler_time_entries (id, traveler_id, job_number, work_center, operator_name, start_time, pause_time, end_time, hours_worked, pause_duration, is_completed, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: traveler_tracking_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.traveler_tracking_logs (id, traveler_id, job_number, work_center, step_sequence, scan_type, scanned_at, scanned_by, notes) FROM stdin;
\.


--
-- Data for Name: travelers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.travelers (id, job_number, work_order_number, po_number, traveler_type, part_number, part_description, revision, quantity, customer_code, customer_name, priority, work_center, status, is_active, notes, specs, specs_date, from_stock, to_stock, ship_via, comments, due_date, ship_date, include_labor_hours, created_by, created_at, updated_at, completed_at, part_id) FROM stdin;
14	8744 PARTS	26015-3		ASSY	565210-002 PART	MAC PANEL PART	A	19	MAC PANEL	MAC PANEL	NORMAL	ENGINEERING	CREATED	t										t	4	2026-01-15 16:51:19.375651+00	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, first_name, last_name, hashed_password, role, is_approver, is_active, created_at, updated_at) FROM stdin;
1	adam	adam@americancircuits.com	Adam		$2b$12$1NZjdec7EuBNXZoVaFgLx..uW86/uiMJz7lPQ5KjGQ5JNY4jDzQnO	ADMIN	t	t	2026-01-13 12:34:39.824065+00	2026-01-13 12:44:55.987754+00
2	kris	kris@americancircuits.com	Kris		$2b$12$SOy4U4N2wW77VfBp6KoT4OikHzvKFTrNl2Xr17Zy9J5qcQdIJqGuS	ADMIN	t	t	2026-01-13 12:34:39.824065+00	2026-01-13 12:44:55.987754+00
3	alex	alex@americancircuits.com	Alex		$2b$12$39iowNOu7vGQcWUWFO2jJOa7Ss/NVS0a/Frxg1xpSrOgiz6NIwhQy	ADMIN	t	t	2026-01-13 12:34:39.824065+00	2026-01-13 12:44:55.987754+00
4	preet	preet@americancircuits.com	Preet		$2b$12$Z7yx2.p/W4.7wQ1nO4SBU.kUFV5ojJOEk.C3tfJvpzgFF8k5OEt7.	ADMIN	t	t	2026-01-13 12:34:39.824065+00	2026-01-13 12:44:55.987754+00
5	kanav	kanav@americancircuits.com	Kanav		$2b$12$.Q1dne2ZLtPk4Ix9ezPoxOS00X3L2iWDMy3QkmYBM9tJwdYClxv1q	ADMIN	t	t	2026-01-13 12:34:39.824065+00	2026-01-13 12:44:55.987754+00
6	pratiksha	pratiksha@americancircuits.com	Pratiksha		$2b$12$65sJzAhKTsWBwBpHQjQpjuEPDKR5ymYoeZR782WJ/zUd41pDBUZW.	ADMIN	t	t	2026-01-13 12:44:55.987754+00	\N
7	cathy	cathy@americancircuits.com	Cathy		$2b$12$M9lOhwriB7j1YVYOVbBlsulJVbO5WX.sHtD8iV/KCq7yCM5xVzjZC	ADMIN	t	t	2026-01-13 12:44:55.987754+00	\N
10	bharat	bharat@americancircuits.com	Bharat		$2b$12$lbUiz7eSiHpdCTxkLRHp7uNeLMQKX7qs0BqBAk0ifG.CxCA3ddamO	OPERATOR	f	t	2026-01-13 15:31:19.418907+00	\N
11	Obeida	obeida@americancircuits.com	Obedia		$2b$12$hcrxRnKiRvWzqW86LU3wZ.XOkp3zdBh.ohcPSRc2HPryNt2GEvaGG	OPERATOR	f	t	2026-01-13 15:32:55.54576+00	\N
12	bhavin	bhavin@americancircuits.com	Bhavin		$2b$12$uJwbN7me6k5ANlw6TL0OCu8Li3n4qijAG8dLV4jY.Fnb1peyb/RDe	OPERATOR	f	t	2026-01-13 15:34:16.045005+00	\N
13	Jayt	jayt@americancircuits.com	Jay T		$2b$12$kFPqciFaSak/TKBG6KYqzu3RUjiwVgKXQ0Rey/jWfECvvRydrboEW	OPERATOR	f	t	2026-01-13 15:35:33.355145+00	\N
14	kamlesh	kamlesh@americancircuits.com	Kamlesh		$2b$12$H6hNcAT4l3Gmx8yyYjQz7.SyUPY2wN4lLJtnrMUdNW77B6b6bD5/G	OPERATOR	f	t	2026-01-13 15:37:27.489658+00	\N
15	Daniel	daniel@americancircuits.com	Daniel		$2b$12$dx728rO8dAbUqPTQ8iV63e5GbCKcolkwdo929BUSIzNd4U7u6GYVm	OPERATOR	f	t	2026-01-13 15:39:22.011088+00	\N
16	colleen	colleen@americancircuits.com	Colleen		$2b$12$fEu5gdjfBlSPQh6F2Znu1OtHk/D6QMgnwtZPis3rDposf.iy3ZnEO	OPERATOR	f	t	2026-01-13 15:40:48.111602+00	\N
17	ramesh	ramesh@americancircuits.com	Ramesh		$2b$12$DzrHYYdWSEoZySTgujuor.pIrDPjWWjr1.y5nVpg3h1kBAaAGLFqi	OPERATOR	f	f	2026-01-13 15:44:22.528099+00	2026-01-13 15:44:34.501081+00
18	rameshkumar	ramesh@americanciruits.com	Ramesh		$2b$12$Jwd1sv.YwZxt3DdzR5FvdOpI4.kQJFSasNcoyjOPY.SRmer8p6cDy	OPERATOR	f	t	2026-01-13 15:45:12.241097+00	\N
19	keola	keola@americancircuits.com	Keola		$2b$12$SLriMzI8Gcu0MRr9tBlu5u1DylCqkg1shOLd/7A9R5YoddsCEHwrW	OPERATOR	f	t	2026-01-13 15:46:07.399973+00	\N
20	jackie	jackie@americancircuits.com	Jackie		$2b$12$2rv.Wj7LHkwkGCeUxUYAm.5u4uyzztTwVm.X4SFguU8koWwWySsxK	OPERATOR	f	t	2026-01-13 15:47:30.052501+00	\N
21	crystal	crystal@americancircuits.com	Crystal		$2b$12$9brOvBsrE/009ENUAmXG0O0pLOdXLNk4EMKNZ6WwQjN8uSWQnDFCe	OPERATOR	f	t	2026-01-13 15:48:18.033985+00	\N
22	tatyana	tatyana@americancircuits.com	Tatyana		$2b$12$aRDlxtIDiXaatXSeX3xRRuBpgJm0Ph2BnHJHjFB8yeKaOb8aX3GI2	OPERATOR	f	t	2026-01-13 15:49:58.816167+00	\N
23	maria	maria@americancircuits.comq	Maria		$2b$12$CY4TUlzLHIvADPLEcgwNIOgYYJ9ZSSRYDXSTVk4KrshZbQGCYlpcK	OPERATOR	f	t	2026-01-13 15:50:55.925459+00	\N
24	sulma	sulma@americancircuits.com	Sulma		$2b$12$heWfrl5Zrsz0rxBdkRNDOezHvFBa.ap2ZqXtJ22RHA.y6vEcueVI6	OPERATOR	f	t	2026-01-13 15:55:00.476471+00	\N
25	theresa	theresa@americancircuits.com	Theresa		$2b$12$VgTZoQrjUU7TGgLkAlvRjOtORAZN5ayV9VxhcseM1qjg/fblV/EEi	OPERATOR	f	t	2026-01-13 15:56:45.318778+00	\N
26	jessica	jessica@americancircuits.com	Jessica		$2b$12$2z5Ve0YwAschBwYZE.K.VuZk//ty2y35huwTNv5s9U6xubf3V.bB6	OPERATOR	f	t	2026-01-13 16:03:36.571799+00	\N
8	admin	admin@americancircuits.com	Admin		$2b$12$DseUIRBR0XnPX7O1WIbDB.Nx7sQXfH5RfH3SEA31wBtdwKAcMU/J6	ADMIN	t	f	2026-01-13 12:44:55.987754+00	2026-01-14 17:19:39.989345+00
\.


--
-- Data for Name: work_centers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_centers (id, name, code, description, is_active, created_at) FROM stdin;
1	ENGINEERING	ENGINEERING	Auto-created from traveler	t	2026-01-15 16:51:19.475821+00
2	INVENTORY	INVENTORY	Auto-created from traveler	t	2026-01-15 16:51:19.51595+00
3	PURCHASING	PURCHASING	Auto-created from traveler	t	2026-01-15 16:51:19.531624+00
\.


--
-- Data for Name: work_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_orders (id, job_number, work_order_number, part_number, part_description, revision, quantity, customer_code, customer_name, work_center, priority, process_template, is_active, created_at) FROM stdin;
\.


--
-- Name: approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.approvals_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, true);


--
-- Name: labor_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.labor_entries_id_seq', 1, false);


--
-- Name: manual_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manual_steps_id_seq', 1, false);


--
-- Name: nexus_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_approvals_id_seq', 1, false);


--
-- Name: nexus_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_audit_logs_id_seq', 1, false);


--
-- Name: nexus_labor_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_labor_entries_id_seq', 1, false);


--
-- Name: nexus_manual_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_manual_steps_id_seq', 1, false);


--
-- Name: nexus_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_notifications_id_seq', 1, false);


--
-- Name: nexus_parts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_parts_id_seq', 1, false);


--
-- Name: nexus_process_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_process_steps_id_seq', 1, false);


--
-- Name: nexus_step_scan_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_step_scan_events_id_seq', 1, false);


--
-- Name: nexus_sub_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_sub_steps_id_seq', 1, false);


--
-- Name: nexus_traveler_time_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_traveler_time_entries_id_seq', 1, false);


--
-- Name: nexus_traveler_tracking_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_traveler_tracking_logs_id_seq', 1, false);


--
-- Name: nexus_travelers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_travelers_id_seq', 1, false);


--
-- Name: nexus_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_users_id_seq', 5, true);


--
-- Name: nexus_work_centers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_work_centers_id_seq', 1, false);


--
-- Name: nexus_work_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_work_orders_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 35, true);


--
-- Name: parts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.parts_id_seq', 1, false);


--
-- Name: process_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.process_steps_id_seq', 8, true);


--
-- Name: step_scan_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.step_scan_events_id_seq', 1, false);


--
-- Name: sub_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sub_steps_id_seq', 1, false);


--
-- Name: traveler_time_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.traveler_time_entries_id_seq', 1, false);


--
-- Name: traveler_tracking_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.traveler_tracking_logs_id_seq', 1, false);


--
-- Name: travelers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.travelers_id_seq', 14, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 26, true);


--
-- Name: work_centers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.work_centers_id_seq', 3, true);


--
-- Name: work_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.work_orders_id_seq', 1, false);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: labor_entries labor_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT labor_entries_pkey PRIMARY KEY (id);


--
-- Name: manual_steps manual_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_steps
    ADD CONSTRAINT manual_steps_pkey PRIMARY KEY (id);


--
-- Name: nexus_approvals nexus_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals
    ADD CONSTRAINT nexus_approvals_pkey PRIMARY KEY (id);


--
-- Name: nexus_audit_logs nexus_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_audit_logs
    ADD CONSTRAINT nexus_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: nexus_labor_entries nexus_labor_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_labor_entries
    ADD CONSTRAINT nexus_labor_entries_pkey PRIMARY KEY (id);


--
-- Name: nexus_manual_steps nexus_manual_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_manual_steps
    ADD CONSTRAINT nexus_manual_steps_pkey PRIMARY KEY (id);


--
-- Name: nexus_notifications nexus_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_notifications
    ADD CONSTRAINT nexus_notifications_pkey PRIMARY KEY (id);


--
-- Name: nexus_parts nexus_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_parts
    ADD CONSTRAINT nexus_parts_pkey PRIMARY KEY (id);


--
-- Name: nexus_process_steps nexus_process_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_process_steps
    ADD CONSTRAINT nexus_process_steps_pkey PRIMARY KEY (id);


--
-- Name: nexus_step_scan_events nexus_step_scan_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_step_scan_events
    ADD CONSTRAINT nexus_step_scan_events_pkey PRIMARY KEY (id);


--
-- Name: nexus_sub_steps nexus_sub_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_sub_steps
    ADD CONSTRAINT nexus_sub_steps_pkey PRIMARY KEY (id);


--
-- Name: nexus_traveler_time_entries nexus_traveler_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_time_entries
    ADD CONSTRAINT nexus_traveler_time_entries_pkey PRIMARY KEY (id);


--
-- Name: nexus_traveler_tracking_logs nexus_traveler_tracking_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_tracking_logs
    ADD CONSTRAINT nexus_traveler_tracking_logs_pkey PRIMARY KEY (id);


--
-- Name: nexus_travelers nexus_travelers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_travelers
    ADD CONSTRAINT nexus_travelers_pkey PRIMARY KEY (id);


--
-- Name: nexus_users nexus_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_users
    ADD CONSTRAINT nexus_users_pkey PRIMARY KEY (id);


--
-- Name: nexus_work_centers nexus_work_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_work_centers
    ADD CONSTRAINT nexus_work_centers_code_key UNIQUE (code);


--
-- Name: nexus_work_centers nexus_work_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_work_centers
    ADD CONSTRAINT nexus_work_centers_pkey PRIMARY KEY (id);


--
-- Name: nexus_work_orders nexus_work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_work_orders
    ADD CONSTRAINT nexus_work_orders_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: parts parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_pkey PRIMARY KEY (id);


--
-- Name: process_steps process_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps
    ADD CONSTRAINT process_steps_pkey PRIMARY KEY (id);


--
-- Name: step_scan_events step_scan_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_scan_events
    ADD CONSTRAINT step_scan_events_pkey PRIMARY KEY (id);


--
-- Name: sub_steps sub_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_steps
    ADD CONSTRAINT sub_steps_pkey PRIMARY KEY (id);


--
-- Name: traveler_time_entries traveler_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_time_entries
    ADD CONSTRAINT traveler_time_entries_pkey PRIMARY KEY (id);


--
-- Name: traveler_tracking_logs traveler_tracking_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_tracking_logs
    ADD CONSTRAINT traveler_tracking_logs_pkey PRIMARY KEY (id);


--
-- Name: travelers travelers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travelers
    ADD CONSTRAINT travelers_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_centers work_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_code_key UNIQUE (code);


--
-- Name: work_centers work_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);


--
-- Name: ix_approvals_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_approvals_id ON public.approvals USING btree (id);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_labor_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_labor_entries_id ON public.labor_entries USING btree (id);


--
-- Name: ix_manual_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_manual_steps_id ON public.manual_steps USING btree (id);


--
-- Name: ix_nexus_approvals_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_approvals_id ON public.nexus_approvals USING btree (id);


--
-- Name: ix_nexus_audit_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_audit_logs_id ON public.nexus_audit_logs USING btree (id);


--
-- Name: ix_nexus_labor_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_labor_entries_id ON public.nexus_labor_entries USING btree (id);


--
-- Name: ix_nexus_manual_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_manual_steps_id ON public.nexus_manual_steps USING btree (id);


--
-- Name: ix_nexus_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_notifications_created_at ON public.nexus_notifications USING btree (created_at);


--
-- Name: ix_nexus_notifications_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_notifications_id ON public.nexus_notifications USING btree (id);


--
-- Name: ix_nexus_parts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_parts_id ON public.nexus_parts USING btree (id);


--
-- Name: ix_nexus_parts_part_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_parts_part_number ON public.nexus_parts USING btree (part_number);


--
-- Name: ix_nexus_process_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_process_steps_id ON public.nexus_process_steps USING btree (id);


--
-- Name: ix_nexus_step_scan_events_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_step_scan_events_id ON public.nexus_step_scan_events USING btree (id);


--
-- Name: ix_nexus_step_scan_events_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_step_scan_events_job_number ON public.nexus_step_scan_events USING btree (job_number);


--
-- Name: ix_nexus_step_scan_events_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_step_scan_events_scanned_at ON public.nexus_step_scan_events USING btree (scanned_at);


--
-- Name: ix_nexus_sub_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_sub_steps_id ON public.nexus_sub_steps USING btree (id);


--
-- Name: ix_nexus_traveler_time_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_traveler_time_entries_id ON public.nexus_traveler_time_entries USING btree (id);


--
-- Name: ix_nexus_traveler_time_entries_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_traveler_time_entries_job_number ON public.nexus_traveler_time_entries USING btree (job_number);


--
-- Name: ix_nexus_traveler_tracking_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_traveler_tracking_logs_id ON public.nexus_traveler_tracking_logs USING btree (id);


--
-- Name: ix_nexus_traveler_tracking_logs_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_traveler_tracking_logs_job_number ON public.nexus_traveler_tracking_logs USING btree (job_number);


--
-- Name: ix_nexus_traveler_tracking_logs_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_traveler_tracking_logs_scanned_at ON public.nexus_traveler_tracking_logs USING btree (scanned_at);


--
-- Name: ix_nexus_travelers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_travelers_id ON public.nexus_travelers USING btree (id);


--
-- Name: ix_nexus_travelers_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_travelers_job_number ON public.nexus_travelers USING btree (job_number);


--
-- Name: ix_nexus_travelers_work_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_travelers_work_order_number ON public.nexus_travelers USING btree (work_order_number);


--
-- Name: ix_nexus_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_nexus_users_email ON public.nexus_users USING btree (email);


--
-- Name: ix_nexus_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_users_id ON public.nexus_users USING btree (id);


--
-- Name: ix_nexus_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_nexus_users_username ON public.nexus_users USING btree (username);


--
-- Name: ix_nexus_work_centers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_work_centers_id ON public.nexus_work_centers USING btree (id);


--
-- Name: ix_nexus_work_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_work_orders_id ON public.nexus_work_orders USING btree (id);


--
-- Name: ix_nexus_work_orders_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_work_orders_job_number ON public.nexus_work_orders USING btree (job_number);


--
-- Name: ix_nexus_work_orders_work_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_work_orders_work_order_number ON public.nexus_work_orders USING btree (work_order_number);


--
-- Name: ix_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: ix_notifications_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_id ON public.notifications USING btree (id);


--
-- Name: ix_parts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_parts_id ON public.parts USING btree (id);


--
-- Name: ix_parts_part_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_parts_part_number ON public.parts USING btree (part_number);


--
-- Name: ix_process_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_process_steps_id ON public.process_steps USING btree (id);


--
-- Name: ix_step_scan_events_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_step_scan_events_id ON public.step_scan_events USING btree (id);


--
-- Name: ix_step_scan_events_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_step_scan_events_job_number ON public.step_scan_events USING btree (job_number);


--
-- Name: ix_step_scan_events_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_step_scan_events_scanned_at ON public.step_scan_events USING btree (scanned_at);


--
-- Name: ix_sub_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sub_steps_id ON public.sub_steps USING btree (id);


--
-- Name: ix_traveler_time_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_traveler_time_entries_id ON public.traveler_time_entries USING btree (id);


--
-- Name: ix_traveler_time_entries_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_traveler_time_entries_job_number ON public.traveler_time_entries USING btree (job_number);


--
-- Name: ix_traveler_tracking_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_traveler_tracking_logs_id ON public.traveler_tracking_logs USING btree (id);


--
-- Name: ix_traveler_tracking_logs_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_traveler_tracking_logs_job_number ON public.traveler_tracking_logs USING btree (job_number);


--
-- Name: ix_traveler_tracking_logs_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_traveler_tracking_logs_scanned_at ON public.traveler_tracking_logs USING btree (scanned_at);


--
-- Name: ix_travelers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_travelers_id ON public.travelers USING btree (id);


--
-- Name: ix_travelers_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_travelers_job_number ON public.travelers USING btree (job_number);


--
-- Name: ix_travelers_work_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_travelers_work_order_number ON public.travelers USING btree (work_order_number);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_work_centers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_centers_id ON public.work_centers USING btree (id);


--
-- Name: ix_work_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_orders_id ON public.work_orders USING btree (id);


--
-- Name: ix_work_orders_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_orders_job_number ON public.work_orders USING btree (job_number);


--
-- Name: ix_work_orders_work_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_orders_work_order_number ON public.work_orders USING btree (work_order_number);


--
-- Name: approvals approvals_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: approvals approvals_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id);


--
-- Name: approvals approvals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: approvals approvals_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: audit_logs audit_logs_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: labor_entries labor_entries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT labor_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: labor_entries labor_entries_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT labor_entries_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.process_steps(id);


--
-- Name: labor_entries labor_entries_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT labor_entries_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: manual_steps manual_steps_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_steps
    ADD CONSTRAINT manual_steps_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id);


--
-- Name: manual_steps manual_steps_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_steps
    ADD CONSTRAINT manual_steps_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: nexus_approvals nexus_approvals_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals
    ADD CONSTRAINT nexus_approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_approvals nexus_approvals_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals
    ADD CONSTRAINT nexus_approvals_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_approvals nexus_approvals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals
    ADD CONSTRAINT nexus_approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_approvals nexus_approvals_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals
    ADD CONSTRAINT nexus_approvals_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_audit_logs nexus_audit_logs_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_audit_logs
    ADD CONSTRAINT nexus_audit_logs_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_audit_logs nexus_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_audit_logs
    ADD CONSTRAINT nexus_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.nexus_users(id);


--
-- Name: nexus_labor_entries nexus_labor_entries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_labor_entries
    ADD CONSTRAINT nexus_labor_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.nexus_users(id);


--
-- Name: nexus_labor_entries nexus_labor_entries_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_labor_entries
    ADD CONSTRAINT nexus_labor_entries_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.nexus_process_steps(id);


--
-- Name: nexus_labor_entries nexus_labor_entries_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_labor_entries
    ADD CONSTRAINT nexus_labor_entries_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_manual_steps nexus_manual_steps_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_manual_steps
    ADD CONSTRAINT nexus_manual_steps_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_manual_steps nexus_manual_steps_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_manual_steps
    ADD CONSTRAINT nexus_manual_steps_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_notifications nexus_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_notifications
    ADD CONSTRAINT nexus_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.nexus_users(id);


--
-- Name: nexus_process_steps nexus_process_steps_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_process_steps
    ADD CONSTRAINT nexus_process_steps_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_process_steps nexus_process_steps_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_process_steps
    ADD CONSTRAINT nexus_process_steps_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_process_steps nexus_process_steps_work_center_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_process_steps
    ADD CONSTRAINT nexus_process_steps_work_center_code_fkey FOREIGN KEY (work_center_code) REFERENCES public.nexus_work_centers(code);


--
-- Name: nexus_step_scan_events nexus_step_scan_events_scanned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_step_scan_events
    ADD CONSTRAINT nexus_step_scan_events_scanned_by_fkey FOREIGN KEY (scanned_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_step_scan_events nexus_step_scan_events_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_step_scan_events
    ADD CONSTRAINT nexus_step_scan_events_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_sub_steps nexus_sub_steps_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_sub_steps
    ADD CONSTRAINT nexus_sub_steps_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_sub_steps nexus_sub_steps_process_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_sub_steps
    ADD CONSTRAINT nexus_sub_steps_process_step_id_fkey FOREIGN KEY (process_step_id) REFERENCES public.nexus_process_steps(id);


--
-- Name: nexus_traveler_time_entries nexus_traveler_time_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_time_entries
    ADD CONSTRAINT nexus_traveler_time_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_traveler_time_entries nexus_traveler_time_entries_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_time_entries
    ADD CONSTRAINT nexus_traveler_time_entries_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_traveler_tracking_logs nexus_traveler_tracking_logs_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_tracking_logs
    ADD CONSTRAINT nexus_traveler_tracking_logs_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_travelers nexus_travelers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_travelers
    ADD CONSTRAINT nexus_travelers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_travelers nexus_travelers_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_travelers
    ADD CONSTRAINT nexus_travelers_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.nexus_parts(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: process_steps process_steps_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps
    ADD CONSTRAINT process_steps_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: process_steps process_steps_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps
    ADD CONSTRAINT process_steps_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: process_steps process_steps_work_center_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps
    ADD CONSTRAINT process_steps_work_center_code_fkey FOREIGN KEY (work_center_code) REFERENCES public.work_centers(code);


--
-- Name: step_scan_events step_scan_events_scanned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_scan_events
    ADD CONSTRAINT step_scan_events_scanned_by_fkey FOREIGN KEY (scanned_by) REFERENCES public.users(id);


--
-- Name: step_scan_events step_scan_events_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_scan_events
    ADD CONSTRAINT step_scan_events_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: sub_steps sub_steps_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_steps
    ADD CONSTRAINT sub_steps_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: sub_steps sub_steps_process_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_steps
    ADD CONSTRAINT sub_steps_process_step_id_fkey FOREIGN KEY (process_step_id) REFERENCES public.process_steps(id);


--
-- Name: traveler_time_entries traveler_time_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_time_entries
    ADD CONSTRAINT traveler_time_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: traveler_time_entries traveler_time_entries_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_time_entries
    ADD CONSTRAINT traveler_time_entries_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: traveler_tracking_logs traveler_tracking_logs_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_tracking_logs
    ADD CONSTRAINT traveler_tracking_logs_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: travelers travelers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travelers
    ADD CONSTRAINT travelers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: travelers travelers_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travelers
    ADD CONSTRAINT travelers_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- PostgreSQL database dump complete
--

\unrestrict NaZWHfZaPdkDkR7YL9cwc0jc6TGGe9LCLnc88HYfRnqKMQWtCkVoVOsYCV6QPsq

